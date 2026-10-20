#!/usr/bin/env node
/**
 * Phase 2 — imports `scraped-data/blog-posts.json` (produced by
 * scrape-blog.js) into this project's MongoDB as Blog documents.
 *
 * Safe by default: runs as a dry run and only prints what it *would* do.
 * Pass --commit to upload images and write to the database.
 *
 *   node src/scripts/import-scraped-blog.js              # preview only
 *   node src/scripts/import-scraped-blog.js --commit     # upload + insert
 *   node src/scripts/import-scraped-blog.js --commit --ids=111,153
 *   node src/scripts/import-scraped-blog.js --commit --reupload   # fresh images
 *
 * Idempotent: each scraped post keeps its source slug, so re-running updates
 * the post it created last time instead of inserting a duplicate. Uploaded
 * images are remembered in `scraped-data/blog-image-map.json`, so a re-run
 * neither re-uploads nor depends on the previous run having finished.
 *
 * Content pipeline, in order:
 *   1. drop the leading heading that repeats the post's own title
 *   2. point every <img> at its uploaded Cloudinary copy; drop the tag when
 *      the source image could not be downloaded (954 of them are third-party
 *      hotlinks on hosts that block us)
 *   3. append the FAQ block and the "where the figures come from" note, which
 *      sit outside `.blog-content` on the source page
 */
import * as cheerio from 'cheerio';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import Blog from '../models/Blog.js';
import User from '../models/User.js';
import { isCloudinaryConfigured, uploadImage } from '../services/cloudinary.service.js';
import { sanitizeRichText } from '../utils/sanitizeHtml.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'scraped-data');
const POSTS_JSON = path.join(DATA_DIR, 'blog-posts.json');
const IMAGES_DIR = path.join(DATA_DIR, 'blog-images');
const IMAGE_MAP_JSON = path.join(DATA_DIR, 'blog-image-map.json');

const BASE = 'https://Animalssss.com';
const CLOUDINARY_FOLDER = 'Animals-super-store/blog';
const UPLOAD_CONCURRENCY = 4;
/**
 * Cloudinary throttles a burst of a few thousand uploads and reports it as
 * "Invalid image file" rather than a rate-limit error, so a single attempt is
 * not trustworthy. Retrying a rejected file a moment later succeeds, which is
 * why every upload gets several attempts before it is written off.
 */
const UPLOAD_ATTEMPTS = 3;
const UPLOAD_BACKOFF_MS = 600;
/** Save the image map every N successful uploads so a crash keeps the work. */
const MAP_CHECKPOINT_EVERY = 250;

/** Destination limits — server/src/models/Blog.js + blog.validator.js. */
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 30;

/**
 * Tags the source attaches to every post regardless of topic: a site name, a
 * language label, and a generic blog marker. They carry no meaning on the new
 * site and would otherwise eat one of the 8 tag slots on all 286 posts.
 */
const FILLER_TAGS = new Set(['farming blog', 'Animalssss', 'hindi', 'english', 'blog']);

/** Elements the leading-title check will consider removing. */
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div']);

/**
 * The source files 100 general Animals/pet posts under a *language* label
 * (`Hindi`, `English`) instead of a topic, so those two become `General` —
 * the model's own default. Mapping them to a real topic would be guessing at
 * content the source never categorised. The lone lowercase `Animalss` is the
 * same category as the 18 properly-cased `Animalss`, so it folds into them.
 */
const CATEGORY_ALIASES = new Map([
  ['hindi', 'General'],
  ['english', 'General'],
  ['Animalss', 'Animalss'],
  ['Animals', 'Animalss'],
]);

function normalizeCategory(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return 'General';
  return CATEGORY_ALIASES.get(value.toLowerCase()) ?? value;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(`--${name}`);
const argValue = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const COMMIT = hasFlag('commit');
const REUPLOAD = hasFlag('reupload');
const LIMIT = argValue('limit', null) === null ? null : Number(argValue('limit'));
const ONLY_IDS = argValue('ids', null) === null ? null : argValue('ids').split(',').map((s) => s.trim());

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------
/** Comparison form: case-folded, punctuation dropped, whitespace collapsed. */
const WORD_CHAR = /[a-z0-9ऀ-ॿ؀-ۿ]/i;
function normText(value) {
  let out = '';
  let needSpace = false;
  for (const ch of String(value ?? '')) {
    if (WORD_CHAR.test(ch)) {
      if (needSpace) out += ' ';
      out += ch.toLowerCase();
      needSpace = false;
    } else {
      needSpace = out.length > 0;
    }
  }
  return out;
}

/** Absolute form of a src as it appears in the body HTML. */
function absoluteSrc(src) {
  const s = String(src ?? '').trim();
  if (!s || s.startsWith('data:')) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('/')) return `${BASE}${s}`;
  return s;
}

function cleanTags(tags) {
  const out = [];
  for (const raw of tags ?? []) {
    const tag = String(raw).trim();
    if (!tag || tag.length > MAX_TAG_LENGTH) continue;
    if (FILLER_TAGS.has(tag.toLowerCase())) continue;
    if (out.some((t) => t.toLowerCase() === tag.toLowerCase())) continue;
    out.push(tag);
    if (out.length === MAX_TAGS) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Content pipeline
// ---------------------------------------------------------------------------
/**
 * Removes a heading at the very top of the body that just repeats the post
 * title (132 of 286 posts open this way — the source prints the title again as
 * an <h3> inside the article). Leading empty spacer paragraphs, the `&nbsp;`
 * ones the source uses for spacing, are dropped at the same time.
 *
 * Only the *first* non-empty element is considered, and only if it matches the
 * title exactly once normalised. A body that merely mentions its title in the
 * opening sentence is left untouched.
 */
function stripLeadingTitle($, root, title) {
  const target = normText(title);
  if (!target) return false;

  let removed = false;
  for (let guard = 0; guard < 6; guard += 1) {
    const first = root.children().first();
    if (!first.length) break;

    const tag = String(first[0].tagName ?? '').toLowerCase();
    const text = normText(first.text());

    if (!text) {
      first.remove(); // empty spacer node left behind by the source
      continue;
    }
    if (!removed && HEADING_TAGS.has(tag) && text === target) {
      first.remove();
      removed = true;
      continue;
    }
    break; // first real content that is not a repeat — stop looking
  }
  return removed;
}

/**
 * Points every <img> at its uploaded copy. An image the scraper could not
 * download has no local file, so its tag is removed rather than left pointing
 * at a hotlink that 403s — a broken image in the body is worse than none.
 *
 * `resolve` maps an image record to its uploaded `{ url }`, or null when the
 * file is unavailable. The dry run passes a stand-in resolver so the preview
 * shows the structure the real import would produce rather than an empty one.
 */
function rewriteImages($, root, imageByUrl, resolve) {
  const stats = { kept: 0, removed: 0, unresolved: 0 };

  root.find('img').each((_, el) => {
    const $el = $(el);
    const record = imageByUrl.get(absoluteSrc($el.attr('src')));

    if (!record) {
      $el.remove();
      stats.unresolved += 1;
      return;
    }
    const uploaded = resolve(record);
    if (!uploaded) {
      $el.remove();
      stats.removed += 1;
      return;
    }
    $el.attr('src', uploaded.url);
    stats.kept += 1;
  });

  return stats;
}

/**
 * Real resolver: only images that made it to Cloudinary survive.
 * `imageMap` is a Map, so this must use .get() — bracket indexing silently
 * returns undefined for every key and would drop all body images. Entries
 * marked failed have no `.url`, so they resolve to null and are dropped.
 */
const liveResolver = (imageMap) => (record) => {
  if (!record.localPath) return null;
  const entry = imageMap.get(path.basename(record.localPath));
  return entry?.url ? entry : null;
};

/** Dry-run resolver: assume every downloaded file uploads cleanly. */
const previewResolver = (record) => (record.localPath ? { url: record.url } : null);

/** Wraps the trailing sections the source keeps outside `.blog-content`. */
function appendSections($, root, post) {
  const appended = { faq: false, howWritten: false };

  if (post.faqHtml) {
    const faq = cheerio.load(`<div id="faq">${post.faqHtml}</div>`, null, false);
    faq('#faq details').removeAttr('class').removeAttr('open');
    root.append(faq('#faq').html() ?? '');
    appended.faq = true;
  }

  if (post.howWritten && String(post.howWritten).trim()) {
    const text = String(post.howWritten).trim();
    // The source stores this as plain text with a marker emoji; keep it as a
    // paragraph so it renders in the destination editor like any other text.
    root.append(`<hr><p>${text}</p>`);
    appended.howWritten = true;
  }

  return appended;
}

function buildContent(post, resolve) {
  const $ = cheerio.load(post.contentHtml ?? '', null, false);
  const root = $.root();

  const imageByUrl = new Map();
  for (const img of post.images ?? []) imageByUrl.set(absoluteSrc(img.url), img);

  const titleStripped = stripLeadingTitle($, root, post.title);
  const images = rewriteImages($, root, imageByUrl, resolve);
  const sections = appendSections($, root, post);

  return { html: sanitizeRichText(root.html() ?? ''), titleStripped, images, sections };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const raw = JSON.parse(await fs.readFile(POSTS_JSON, 'utf8'));
  let posts = raw.posts ?? [];
  if (ONLY_IDS) posts = posts.filter((p) => ONLY_IDS.includes(String(p.sourceId)));
  if (LIMIT !== null) posts = posts.slice(0, LIMIT);

  console.log(`[import] mode        : ${COMMIT ? 'COMMIT (uploads + writes)' : 'DRY RUN (no writes)'}`);
  console.log(`[import] source      : ${posts.length} post(s) from blog-posts.json`);
  console.log(`[import] cloudinary  : ${isCloudinaryConfigured() ? `configured, folder ${CLOUDINARY_FOLDER}` : 'NOT CONFIGURED — --commit will fail'}`);

  await mongoose.connect(env.mongoUri);
  const author = await User.findOne({ role: 'ADMIN' }).sort({ createdAt: 1 });
  if (!author) throw new Error('No ADMIN user found — the Blog model requires an author.');

  // ---- image map: filename -> { url, publicId } from earlier runs ----
  let imageMap = {};
  if (!REUPLOAD) {
    try {
      imageMap = JSON.parse(await fs.readFile(IMAGE_MAP_JSON, 'utf8'));
    } catch {
      imageMap = {};
    }
  }
  const cachedCount = Object.keys(imageMap).length;

  // ---- plan ----
  const plan = [];
  const stats = {
    tagsTrimmed: 0,
    tagsDroppedFiller: 0,
    titleStripped: 0,
    imgsKept: 0,
    imgsDropped: 0,
    imgsUnresolved: 0,
    faqAppended: 0,
    howWrittenAppended: 0,
    noCover: 0,
  };
  // Every distinct image file the whole import needs, so each uploads once
  // even when several posts embed the same picture.
  const filesToUpload = new Map(); // basename -> absolute path

  for (const post of posts) {
    const tagsBefore = (post.tags ?? []).length;
    const tags = cleanTags(post.tags);
    if (tags.length < tagsBefore) stats.tagsTrimmed += 1;
    if ((post.tags ?? []).some((t) => FILLER_TAGS.has(String(t).trim().toLowerCase()))) {
      stats.tagsDroppedFiller += 1;
    }

    const cover = (post.images ?? []).find((i) => i.kind === 'cover' && i.localPath) ?? null;
    if (!cover) stats.noCover += 1;

    for (const img of post.images ?? []) {
      if (!img.localPath) continue;
      const base = path.basename(img.localPath);
      if (!filesToUpload.has(base)) filesToUpload.set(base, path.join(IMAGES_DIR, base));
    }

    // Build once here so the preview reports real numbers instead of zeroes;
    // the write pass rebuilds with the live resolver.
    const built = buildContent(post, previewResolver);
    stats.imgsKept += built.images.kept;
    stats.imgsDropped += built.images.removed;
    stats.imgsUnresolved += built.images.unresolved;
    if (built.titleStripped) stats.titleStripped += 1;
    if (built.sections.faq) stats.faqAppended += 1;
    if (built.sections.howWritten) stats.howWrittenAppended += 1;

    plan.push({
      post,
      built,
      slug: post.sourceSlug,
      category: normalizeCategory(post.category),
      tags,
      cover,
      publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
    });
  }

  // Files with a usable cached URL are done; anything else needs uploading —
  // including entries from an earlier run that failed but can still be retried.
  const needsUpload = (base) => {
    const entry = imageMap[base];
    if (!entry) return true;
    if (entry.url) return false;
    return (entry.attempts ?? 0) < UPLOAD_ATTEMPTS;
  };
  const toUpload = [...filesToUpload.keys()].filter(needsUpload);
  const givenUp = [...filesToUpload.keys()].filter((b) => imageMap[b] && !imageMap[b].url && !needsUpload(b));
  const missingOnDisk = [];
  for (const [base, abs] of filesToUpload) {
    try {
      await fs.access(abs);
    } catch {
      missingOnDisk.push(base);
    }
  }

  // ---- preview ----
  console.log(`\n================= IMPORT PREVIEW =================`);
  console.log(`Posts to import            : ${plan.length}`);
  console.log(`Author                     : ${author.name} (${author.email})`);
  console.log(`Status                     : published`);
  console.log(`Distinct image files        : ${filesToUpload.size}`);
  console.log(`  already uploaded (cached) : ${filesToUpload.size - toUpload.length}${cachedCount ? '' : ' (no cache yet)'}`);
  console.log(`  to upload now             : ${toUpload.length}`);
  const retries = toUpload.filter((b) => imageMap[b]?.failed).length;
  if (retries) console.log(`    of which retries        : ${retries} (previously throttled or unreadable)`);
  if (givenUp.length) console.log(`  given up on               : ${givenUp.length} (tried ${UPLOAD_ATTEMPTS}x already)`);
  console.log(`Images dropped from bodies  : ${stats.imgsDropped}`);
  console.log(`Image tags with no record   : ${stats.imgsUnresolved}`);
  console.log(`Titles de-duplicated in body: ${stats.titleStripped}`);
  console.log(`Tag lists trimmed to ${MAX_TAGS}       : ${stats.tagsTrimmed}`);
  console.log(`Posts that had filler tags  : ${stats.tagsDroppedFiller}`);
  console.log(`FAQ sections appended       : ${stats.faqAppended}`);
  console.log(`Source notes appended       : ${stats.howWrittenAppended}`);
  if (stats.noCover) console.log(`Posts without a cover image : ${stats.noCover}`);
  if (missingOnDisk.length) console.log(`MISSING image files on disk : ${missingOnDisk.length}`);

  console.log('\nSlug check:');
  const slugs = plan.map((p) => p.slug);
  const dupesInPlan = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  const existing = await Blog.find({ slug: { $in: slugs } }).select('slug').lean();
  const existingSlugs = new Set(existing.map((b) => b.slug));
  console.log(`  duplicate slugs within import : ${dupesInPlan.length}`);
  console.log(`  slugs already in the database : ${existingSlugs.size}${existingSlugs.size ? ` -> will UPDATE those posts` : ' -> all NEW inserts'}`);
  const nonAscii = slugs.filter((s) => /[^\x00-\x7F]/.test(s));
  console.log(`  slugs containing non-ASCII    : ${nonAscii.length} (kept as-is, e.g. "${(nonAscii[0] ?? '').slice(0, 40)}")`);
  console.log(`  longest slug                  : ${Math.max(...slugs.map((s) => s.length))} chars`);

  const catTally = new Map();
  for (const p of plan) catTally.set(p.category, (catTally.get(p.category) ?? 0) + 1);
  console.log('\nCategories as they would be written:');
  for (const [c, n] of [...catTally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(c).padEnd(14)} ${n}`);
  }

  console.log('\nSamples (content after pipeline):');
  for (const item of plan.slice(0, 2)) {
    const built = item.built;
    console.log(`\n  --- #${item.post.sourceId} "${item.post.title.slice(0, 60)}"`);
    console.log(`      slug      : ${item.slug}`);
    console.log(`      tags      : ${item.tags.join(' | ') || '(none)'}`);
    console.log(`      images    : kept=${built.images.kept} dropped=${built.images.removed} unresolved=${built.images.unresolved}`);
    console.log(`      title cut : ${built.titleStripped}   faq=${built.sections.faq} notes=${built.sections.howWritten}`);
    console.log(`      content   : ${built.html.length} chars`);
    console.log(`      starts    : ${JSON.stringify(built.html.slice(0, 160))}`);
  }
  console.log('=================================================');

  if (!COMMIT) {
    console.log('\nDRY RUN — nothing uploaded or written. Re-run with --commit to import.');
    await mongoose.disconnect();
    return;
  }

  if (missingOnDisk.length) {
    throw new Error(
      `${missingOnDisk.length} image file(s) are referenced by blog-posts.json but missing from ${IMAGES_DIR}. ` +
        `Re-run the scraper (\`npm run scrape-blog -w server\`) first.`
    );
  }

  // ---- upload ----
  console.log(`\n[import] uploading ${toUpload.length} image(s) to Cloudinary…`);
  let uploaded = 0;
  const uploadErrors = [];
  const queue = [...toUpload];

  const saveMap = () => fs.writeFile(IMAGE_MAP_JSON, JSON.stringify(imageMap, null, 2), 'utf8');

  /** Uploads one file, retrying the throttle-shaped failures. */
  const uploadOne = async (base) => {
    let lastError;
    for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt += 1) {
      try {
        const buffer = await fs.readFile(filesToUpload.get(base));
        const { url, publicId } = await uploadImage(buffer, CLOUDINARY_FOLDER);
        imageMap[base] = { url, publicId, bytes: buffer.length };
        return true;
      } catch (error) {
        lastError = error;
        if (attempt < UPLOAD_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, UPLOAD_BACKOFF_MS * attempt));
        }
      }
    }
    // Remember the failure so a re-run picks up where this one stopped, and so
    // a file that is genuinely not an image is not retried forever.
    imageMap[base] = {
      failed: true,
      attempts: (imageMap[base]?.attempts ?? 0) + UPLOAD_ATTEMPTS,
      error: lastError?.message,
    };
    uploadErrors.push({ file: base, message: lastError?.message });
    return false;
  };

  const workers = Array.from({ length: UPLOAD_CONCURRENCY }, async () => {
    while (queue.length) {
      const base = queue.shift();
      if (await uploadOne(base)) {
        uploaded += 1;
        if (uploaded % 25 === 0) console.log(`[import]   ${uploaded}/${toUpload.length} uploaded…`);
        if (uploaded % MAP_CHECKPOINT_EVERY === 0) await saveMap();
      }
    }
  });
  await Promise.all(workers);

  // Persist the map before writing posts: a crash after this point means the
  // next run reuses what was uploaded instead of paying for it twice.
  await saveMap();
  console.log(`[import] image map saved (${Object.keys(imageMap).length} entries)`);
  if (uploadErrors.length) console.log(`[import] upload failures after retries: ${uploadErrors.length}`);
  if (givenUp.length) console.log(`[import] already given up on (not retried): ${givenUp.length}`);

  const uploadedByFile = new Map(Object.entries(imageMap));
  const resolve = liveResolver(uploadedByFile);

  // ---- write ----
  console.log('\n[import] writing posts…');
  const results = { inserted: 0, updated: 0, skipped: 0, failed: [] };
  // Counted from the *stored* HTML, not from the preview estimate, so a
  // resolver failure shows up as a number instead of silently emptying bodies.
  const written = { imgsKept: 0, imgsRemoved: 0 };

  for (const item of plan) {
    const { post } = item;
    try {
      const built = buildContent(post, resolve);
      written.imgsKept += built.images.kept;
      written.imgsRemoved += built.images.removed + built.images.unresolved;
      const coverUpload = item.cover ? uploadedByFile.get(path.basename(item.cover.localPath)) : null;

      // The body claimed images but the stored HTML has none: that means the
      // resolver handed back nothing. Fail the post loudly instead of writing
      // a silently image-less article.
      if (built.images.kept > 0 && !built.html.includes('res.cloudinary.com')) {
        throw new Error(
          `${built.images.kept} inline image(s) resolved but the stored HTML has no Cloudinary URL`
        );
      }

      const doc = {
        title: post.title,
        slug: item.slug,
        excerpt: post.excerpt,
        content: built.html,
        coverImage: coverUpload ? { url: coverUpload.url, publicId: coverUpload.publicId } : { url: '', publicId: '' },
        category: item.category,
        tags: item.tags,
        author: author._id,
        status: 'published',
        publishedAt: item.publishedAt,
      };

      const prior = existingSlugs.has(item.slug)
        ? await Blog.findOne({ slug: item.slug })
        : null;

      if (prior) {
        Object.assign(prior, doc);
        await prior.save();
        results.updated += 1;
      } else {
        await new Blog(doc).save();
        results.inserted += 1;
      }
    } catch (error) {
      results.failed.push({ id: post.sourceId, slug: item.slug, reason: error.message });
    }
  }

  // ---- summary ----
  const total = await Blog.countDocuments();
  const publishedCount = await Blog.countDocuments({ status: 'published' });
  const byCat = await Blog.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$category', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);

  console.log('\n================ IMPORT SUMMARY ================');
  console.log(`Inserted              : ${results.inserted}`);
  console.log(`Updated               : ${results.updated}`);
  console.log(`Images uploaded       : ${uploaded}`);
  if (uploadErrors.length) console.log(`Upload failures       : ${uploadErrors.length}`);
  console.log(`Inline images kept    : ${written.imgsKept} (predicted ${stats.imgsKept})`);
  console.log(`Inline images dropped : ${written.imgsRemoved}`);
  if (written.imgsKept < stats.imgsKept) {
    console.log(`WARNING: ${stats.imgsKept - written.imgsKept} image(s) that should have resolved did not — check the image map.`);
  }
  console.log(`Titles de-duplicated  : ${stats.titleStripped}`);
  console.log(`FAQ sections appended : ${stats.faqAppended}`);
  console.log(`Source notes appended : ${stats.howWrittenAppended}`);
  if (results.failed.length) {
    console.log(`Failed posts          : ${results.failed.length}`);
    for (const f of results.failed.slice(0, 20)) console.log(`  #${f.id} ${f.slug} -> ${f.reason}`);
  }
  if (uploadErrors.length) {
    for (const e of uploadErrors.slice(0, 10)) console.log(`  [upload] ${e.file} -> ${e.message}`);
  }
  console.log(`\nBlog posts in database: ${total} (${publishedCount} published)`);
  for (const row of byCat) console.log(`  ${String(row._id).padEnd(16)}: ${row.n}`);
  console.log('===============================================');

  if (results.inserted + results.updated === 0 && results.failed.length > 0) process.exitCode = 1;

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('[import] fatal:', error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
