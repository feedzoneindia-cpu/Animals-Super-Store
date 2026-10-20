#!/usr/bin/env node
/**
 * Scrapes the live Animalssss (Animalssss.com) blog into
 * `scraped-data/blog-posts.json` plus downloaded images in
 * `scraped-data/blog-images/`.
 *
 * Phase 1 of the blog migration: this script only reads the public source site
 * and writes local files. It never touches the Animals Super Store DB.
 *
 * Politeness: requests run strictly one at a time with a delay between each
 * (default 700ms) and an identifying User-Agent. The source site's robots.txt
 * allows /Blog; its /api/ is disallowed and is deliberately not used here.
 * Discovery comes from sitemap-blog.xml, cross-checked against the /Blog index.
 *
 * Resumable: the run checkpoints `blog-posts.json` after every post, and an
 * image already on disk is never re-fetched. A run that dies part-way (a full
 * pass is ~40 minutes) can simply be started again — it picks up where it
 * stopped. `--fresh` ignores the checkpoint and starts over.
 *
 * Usage:
 *   node src/scripts/scrape-blog.js                 # full run, resumes if partial
 *   node src/scripts/scrape-blog.js --limit=3       # first N posts
 *   node src/scripts/scrape-blog.js --ids=303,111   # specific post ids
 *   node src/scripts/scrape-blog.js --no-images     # skip image downloads
 *   node src/scripts/scrape-blog.js --delay=1200    # slower / gentler
 *   node src/scripts/scrape-blog.js --fresh         # discard checkpoint, start over
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'scraped-data');
const IMAGES_DIR = path.join(DATA_DIR, 'blog-images');
const POSTS_JSON = path.join(DATA_DIR, 'blog-posts.json');

const BASE = 'https://Animalssss.com';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/120.0 Safari/537.36 AnimalsSuperStoreBlogMigration/1.0 (+own-content-migration)';

/**
 * Blocks inside `.blog-content` that are not article text: AdSense slots and
 * the script that fills them. Everything else in the container is kept.
 */
const AD_SELECTORS = ['aside.mph-ad', '.mph-ad', 'ins.adsbygoogle', 'script', 'iframe'];

/** Keeps generated filenames well inside Windows' path limits. */
const MAX_SLUG_IN_FILENAME = 40;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(`--${name}`);
const argValue = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const DELAY_MS = Number(argValue('delay', '700'));
const LIMIT = argValue('limit', null) === null ? null : Number(argValue('limit'));
const ONLY_IDS = argValue('ids', null) === null ? null : argValue('ids').split(',').map((s) => s.trim());
const DOWNLOAD_IMAGES = !hasFlag('no-images');
/** Ignore any existing checkpoint and re-scrape every post from scratch. */
const FRESH = hasFlag('fresh');

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
const http = axios.create({
  timeout: 30_000,
  maxRedirects: 5,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en,hi;q=0.9',
  },
  validateStatus: (s) => s >= 200 && s < 400,
});

/**
 * Fetches a URL and decodes it as UTF-8 explicitly. The source site serves
 * some pages without a charset, so letting the HTTP client guess mangles the
 * Devanagari and Arabic text.
 */
async function fetchText(url) {
  const res = await http.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(res.data).toString('utf8');
}

async function fetchBinary(url) {
  const res = await http.get(url, { responseType: 'arraybuffer' });
  return { buffer: Buffer.from(res.data), contentType: res.headers['content-type'] ?? '' };
}

/**
 * Percent-encodes each path segment. The source sitemap contains raw (already
 * decoded) Hindi and Arabic in its <loc> values, so we normalise idempotently
 * to work for both raw and pre-encoded URLs.
 */
function normalizeSourceUrl(raw) {
  try {
    const url = new URL(raw, BASE);
    url.pathname = url.pathname
      .split('/')
      .map((seg) => {
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join('/');
    return url.toString();
  } catch {
    return raw;
  }
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------
const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

/** Comparison form: case-folded, punctuation dropped, whitespace collapsed. */
const compareForm = (s) =>
  norm(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/**
 * Tidies scraped markup without touching inline spacing: only whitespace runs
 * that contain a newline are collapsed, so "word</strong> <em>next" keeps its
 * separating space.
 */
function normalizeContentHtml(html) {
  return String(html ?? '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

const hasDevanagari = (s) => /[ऀ-ॿ]/.test(s ?? '');
const hasArabic = (s) => /[؀-ۿ]/.test(s ?? '');

/**
 * The source's own `inLanguage` says "en" on Hindi and Arabic posts, so it is
 * not trusted. The category is reliable when it is a language name; otherwise
 * the script of the title decides.
 */
function detectLanguage(title, articleSection) {
  if (/^hindi$/i.test(articleSection ?? '')) return 'hi';
  if (/^english$/i.test(articleSection ?? '')) return 'en';
  if (hasArabic(title)) return 'ar';
  if (hasDevanagari(title)) return 'hi';
  return 'en';
}

function slugToFilenamePart(slug) {
  return (slug ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG_IN_FILENAME)
    .replace(/-+$/g, '');
}

const EXT_BY_MIME = {
  'image/jpeg': '.jpeg',
  'image/jpg': '.jpeg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
};

function extensionFor(url, contentType) {
  const mime = String(contentType).split(';')[0].trim().toLowerCase();
  if (EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
  const fromUrl = /\.(jpe?g|png|webp|gif|avif|svg)(?:$|\?)/i.exec(new URL(url, BASE).pathname);
  if (fromUrl) return `.${fromUrl[1].toLowerCase().replace('jpg', 'jpeg')}`;
  return '.jpeg';
}

/** Inverse of EXT_BY_MIME, so a resumed image can report its type without a fetch. */
const MIME_BY_EXT = Object.fromEntries(
  Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext, mime])
);
/** Every extension this script can produce — what a resume looks for on disk. */
const EXT_CANDIDATES = [...new Set(Object.values(EXT_BY_MIME))];

// ---------------------------------------------------------------------------
// Checkpoint / resume
//
// A full pass is ~40 minutes of sequential requests, so losing the whole run to
// one interruption is not acceptable. State is the same `blog-posts.json` the
// finished run produces: it is rewritten after every post, which makes a
// partial file a usable resume point rather than a broken one.
// ---------------------------------------------------------------------------
async function loadState() {
  if (FRESH) return { posts: [], errors: [] };
  try {
    const raw = JSON.parse(await fs.readFile(POSTS_JSON, 'utf8'));
    const posts = Array.isArray(raw.posts) ? raw.posts : [];
    const errors = Array.isArray(raw.errors) ? raw.errors : [];
    return { posts, errors };
  } catch {
    return { posts: [], errors: [] };
  }
}

/**
 * Writes the checkpoint via a temp file + rename, so an interruption mid-write
 * cannot leave a truncated JSON behind — the reader either sees the previous
 * good file or the new one, never half of either.
 */
async function checkpoint(posts, errors) {
  const payload = {
    source: BASE,
    scrapedAt: new Date().toISOString(),
    postCount: posts.length,
    errors,
    posts,
  };
  const tmp = `${POSTS_JSON}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(payload, null, 2), 'utf8');
  await fs.rename(tmp, POSTS_JSON);
}

/** Pulls the BlogPosting (and FAQPage) nodes out of the page's JSON-LD. */
function parseJsonLd($) {
  const out = { posting: null, faq: null, breadcrumb: null };
  $('script[type="application/ld+json"]').each((_, el) => {
    let data;
    try {
      data = JSON.parse($(el).contents().text());
    } catch {
      return;
    }
    const nodes = Array.isArray(data) ? data : data?.['@graph'] ? data['@graph'] : [data];
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      if (node['@type'] === 'BlogPosting' && !out.posting) out.posting = node;
      if (node['@type'] === 'FAQPage' && !out.faq) out.faq = node;
      if (node['@type'] === 'BreadcrumbList' && !out.breadcrumb) out.breadcrumb = node;
    }
  });
  return out;
}

/** JSON-LD `image` is a string here, but the spec allows an object or array. */
function imageUrlFromLd(image) {
  const first = Array.isArray(image) ? image[0] : image;
  if (!first) return '';
  if (typeof first === 'string') return norm(first);
  return norm(first.url ?? first.contentUrl ?? '');
}

/**
 * True when the article body opens by repeating its own title — the same
 * duplication the product descriptions had. Newer posts start straight into
 * the prose; older ones (mostly Hindi) lead with the title as a heading.
 */
function detectLeadingTitleRepeat($, content, title) {
  if (!content.length || !norm(title)) return { repeated: false, text: '', tag: '' };
  const wanted = compareForm(title);
  if (!wanted) return { repeated: false, text: '', tag: '' };

  let checked = 0;
  for (const el of content.children().toArray()) {
    const $el = $(el);
    const text = norm($el.text());
    if (!text) continue; // skips the empty <p>&nbsp;</p> fillers
    checked += 1;
    if (checked > 3) break; // only the opening of the article counts
    const form = compareForm(text);
    if (form === wanted || form.startsWith(`${wanted} `)) {
      return { repeated: true, text: text.slice(0, 120), tag: el.tagName };
    }
  }
  return { repeated: false, text: '', tag: '' };
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------
async function discoverFromSitemap() {
  const xml = await fetchText(`${BASE}/sitemap-blog.xml`);
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  const posts = [];
  for (const block of blocks) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc) continue;
    const m = /\/Blog\/(\d+)\/(.*)$/.exec(new URL(loc, BASE).pathname);
    if (!m) continue;
    let slug = m[2];
    try {
      slug = decodeURIComponent(slug);
    } catch {
      /* keep raw */
    }
    posts.push({
      id: m[1],
      slug,
      url: normalizeSourceUrl(loc),
      sitemapLastmod: block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? null,
    });
  }
  return posts;
}

/**
 * The /Blog index only exposes its first page (later pages are Disallowed by
 * robots.txt), but it is still worth checking that what it links is already in
 * the sitemap. Anything only found here would otherwise be missed.
 */
async function crossCheckIndex(sitemapIds) {
  try {
    const html = await fetchText(`${BASE}/Blog`);
    const ids = [...new Set([...html.matchAll(/\/Blog\/(\d+)\//g)].map((m) => m[1]))];
    return ids.filter((id) => !sitemapIds.has(id));
  } catch (error) {
    return { error: error.message };
  }
}

// ---------------------------------------------------------------------------
// Blog post page
// ---------------------------------------------------------------------------
function parsePostPage(html, target) {
  const $ = cheerio.load(html);
  const jsonLd = parseJsonLd($);
  const ld = jsonLd.posting ?? {};

  const title = norm($('h1').first().text()) || norm(ld.headline) || norm($('title').text());
  const articleSection = norm(ld.articleSection);

  // ---- body ----
  const content = $('.blog-content').first();
  let adsRemoved = 0;
  for (const selector of AD_SELECTORS) {
    const hits = content.find(selector).length;
    if (hits) {
      adsRemoved += hits;
      content.find(selector).remove();
    }
  }
  const contentHtml = normalizeContentHtml(content.html());
  const contentText = norm(content.text());

  // ---- sections that sit beside the body, kept separate so Phase 2 can
  // decide whether any of them belong in the destination's `content` ----
  const faq = $('.blog-faq').first();
  const faqHtml = faq.length ? normalizeContentHtml(faq.html()) : '';
  const faqQuestions = faq.length ? faq.find('summary').length : 0;
  const quickSummary = norm($('.quick-summary').first().text());
  const howWritten = norm($('.how-written').first().text());

  // ---- excerpt: the meta description is written as a summary and fits the
  // destination's 300-char cap best; the rest are fallbacks ----
  const ldDescription = norm(ld.description);
  const ogDescription = norm($('meta[property="og:description"]').attr('content'));
  const excerpt = ldDescription || ogDescription || quickSummary;
  const excerptSource = ldDescription ? 'json-ld' : ogDescription ? 'og:description' : quickSummary ? 'quick-summary' : 'none';

  // ---- images: the cover, then whatever sits inside the body ----
  const coverUrl = imageUrlFromLd(ld.image) || norm($('meta[property="og:image"]').attr('content'));
  const images = [];
  const seen = new Set();
  const push = (src, kind, alt) => {
    const raw = norm(src);
    if (!raw || raw.startsWith('data:')) return;
    let abs;
    try {
      abs = new URL(raw, BASE).toString();
    } catch {
      return;
    }
    if (seen.has(abs)) return;
    seen.add(abs);
    images.push({ url: abs, kind, alt: norm(alt).slice(0, 160) });
  };
  push(coverUrl, 'cover', '');
  content.find('img').each((_, el) => {
    push($(el).attr('src') ?? $(el).attr('data-src') ?? $(el).attr('data-lazy-src'), 'inline', $(el).attr('alt'));
  });

  // ---- tags: the page's own keyword list, capped the way the destination caps ----
  const tags = [
    ...new Set(
      norm($('meta[name="keywords"]').attr('content'))
        .split(',')
        .map((t) => norm(t))
        .filter(Boolean)
    ),
  ];

  const author = norm(typeof ld.author === 'object' ? (ld.author?.name ?? '') : ld.author);
  const repeat = detectLeadingTitleRepeat($, content, title);

  return {
    sourceId: target.id,
    sourceUrl: target.url,
    sourceSlug: target.slug,
    sitemapLastmod: target.sitemapLastmod,

    title,
    language: detectLanguage(title, articleSection),

    excerpt,
    excerptSource,
    quickSummary,

    contentHtml,
    contentTextLength: contentText.length,
    contentHtmlLength: contentHtml.length,
    faqHtml,
    faqQuestions,
    howWritten,

    coverImageUrl: coverUrl,
    images,

    author,
    category: articleSection,
    tags,
    publishedAt: ld.datePublished ?? null,
    modifiedAt: ld.dateModified ?? null,
    wordCount: Number.isFinite(Number(ld.wordCount)) ? Number(ld.wordCount) : null,
    sourceInLanguage: ld.inLanguage ?? null,
    ldBreadcrumb: (jsonLd.breadcrumb?.itemListElement ?? []).map((it) => norm(it?.name)).filter(Boolean),

    adsRemoved,
    titleRepeat: repeat,
    scrapedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------
async function downloadImages(post, errors) {
  const slugPart = slugToFilenamePart(post.sourceSlug) || 'post';
  const counters = {};
  let reusedCount = 0;

  // Images left behind by an earlier, interrupted run. The extension is only
  // knowable from the response, so a resume probes the handful of extensions
  // this script can produce rather than re-fetching to find out.
  let onDisk = new Set();
  try {
    onDisk = new Set(await fs.readdir(IMAGES_DIR));
  } catch {
    onDisk = new Set();
  }

  for (const image of post.images) {
    counters[image.kind] = (counters[image.kind] ?? 0) + 1;
    const index = counters[image.kind];
    const stem = `${post.sourceId}-${slugPart}-${image.kind}-${index}`;

    const reusedName = EXT_CANDIDATES.map((ext) => `${stem}${ext}`).find((f) => onDisk.has(f));
    if (reusedName) {
      const { size } = await fs.stat(path.join(IMAGES_DIR, reusedName));
      if (size > 0) {
        image.localPath = path.posix.join('scraped-data/blog-images', reusedName);
        image.bytes = size;
        image.contentType = MIME_BY_EXT[path.extname(reusedName).toLowerCase()] ?? 'image/jpeg';
        image.reused = true;
        reusedCount += 1;
        continue;
      }
    }

    try {
      await sleep(DELAY_MS);
      const { buffer, contentType } = await fetchBinary(image.url);
      const ext = extensionFor(image.url, contentType);
      const filename = `${stem}${ext}`;
      await fs.writeFile(path.join(IMAGES_DIR, filename), buffer);
      image.localPath = path.posix.join('scraped-data/blog-images', filename);
      image.bytes = buffer.length;
      image.contentType = String(contentType).split(';')[0].trim();
    } catch (error) {
      image.localPath = null;
      errors.push({ postId: post.sourceId, stage: 'image', url: image.url, message: error.message });
    }
  }

  return reusedCount;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  console.log('[scrape] discovering posts from sitemap-blog.xml…');
  let targets = await discoverFromSitemap();
  console.log(`[scrape] sitemap: ${targets.length} blog post URLs`);

  await sleep(DELAY_MS);
  const orphanIds = await crossCheckIndex(new Set(targets.map((t) => t.id)));
  if (Array.isArray(orphanIds) && orphanIds.length) {
    console.warn(`[scrape] WARNING: ${orphanIds.length} post(s) linked from /Blog but absent from the sitemap: ${orphanIds.join(', ')}`);
  } else if (Array.isArray(orphanIds)) {
    console.log('[scrape] cross-check: every post on the /Blog index is in the sitemap');
  }

  if (ONLY_IDS) targets = targets.filter((t) => ONLY_IDS.includes(t.id));
  if (LIMIT !== null) targets = targets.slice(0, LIMIT);
  console.log(`[scrape] scraping ${targets.length} post page(s), delay ${DELAY_MS}ms\n`);

  const { posts, errors } = await loadState();
  if (posts.length) {
    console.log(
      `[scrape] resuming: ${posts.length} post(s) already in the checkpoint, ` +
        `${errors.length} error(s) carried over (--fresh to start over)`
    );
  }
  const done = new Set(posts.map((p) => String(p.sourceId)));
  const pending = targets.filter((t) => !done.has(String(t.id)));
  if (pending.length !== targets.length) {
    console.log(`[scrape] ${targets.length - pending.length} post(s) skipped as already scraped\n`);
  }

  let reusedTotal = 0;

  for (const [i, target] of pending.entries()) {
    const label = `[${i + 1}/${pending.length}] #${target.id}`;
    try {
      await sleep(DELAY_MS);
      const html = await fetchText(target.url);
      const post = parsePostPage(html, target);
      posts.push(post);
      console.log(
        `${label} ${post.title.slice(0, 58) || '(no title)'} — ${post.category || '?'}/${post.language} ` +
          `body=${post.contentTextLength}c cat=${post.category || '?'} tags=${post.tags.length} imgs=${post.images.length}`
      );
      if (DOWNLOAD_IMAGES && post.images.length) reusedTotal += await downloadImages(post, errors);
      // Checkpoint after the post is complete, so an interruption never leaves
      // a post recorded without the images that belong to it.
      await checkpoint(posts, errors);
    } catch (error) {
      errors.push({ postId: target.id, stage: 'page', url: target.url, message: error.message });
      console.log(`${label} FAILED: ${error.message}`);
      await checkpoint(posts, errors);
    }
  }

  if (reusedTotal) console.log(`\n[scrape] ${reusedTotal} image(s) reused from an earlier run (not re-fetched)`);

  await checkpoint(posts, errors);

  // ---- summary ----
  const count = (fn) => posts.filter(fn).length;
  const tally = (fn) =>
    Object.entries(
      posts.reduce((acc, p) => {
        const key = fn(p) || '(none)';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');

  const imagesDownloaded = posts.reduce((n, p) => n + p.images.filter((img) => img.localPath).length, 0);
  // Counted from the error log so a --no-images run is not reported as failing.
  const imagesFailed = errors.filter((e) => e.stage === 'image').length;

  const titleTooShort = posts.filter((p) => p.title.length < 5);
  const titleTooLong = posts.filter((p) => p.title.length > 150);
  const excerptTooShort = posts.filter((p) => p.excerpt.length < 10);
  const excerptTooLong = posts.filter((p) => p.excerpt.length > 300);
  const noBody = posts.filter((p) => !p.contentHtml || p.contentTextLength < 20);
  const noCover = posts.filter((p) => !p.coverImageUrl);
  const noAuthor = posts.filter((p) => !p.author);
  const noDate = posts.filter((p) => !p.publishedAt);
  const noCategory = posts.filter((p) => !p.category);
  const tooManyTags = posts.filter((p) => p.tags.length > 8);
  const longTags = posts.filter((p) => p.tags.some((t) => t.length > 30));
  const repeats = posts.filter((p) => p.titleRepeat.repeated);
  const withFaq = posts.filter((p) => p.faqHtml);
  const noInline = posts.filter((p) => !p.images.some((img) => img.kind === 'inline'));

  console.log('\n================ BLOG SCRAPE SUMMARY ================');
  console.log(`Posts scraped         : ${posts.length}`);
  console.log(`By category           : ${tally((p) => p.category)}`);
  console.log(`By language           : ${tally((p) => p.language)}`);
  console.log(`Images downloaded     : ${imagesDownloaded}${DOWNLOAD_IMAGES ? '' : ' (skipped: --no-images)'}`);
  if (imagesFailed) console.log(`Images failed         : ${imagesFailed}`);
  console.log(`Errors                : ${errors.length}`);

  console.log('\nField coverage:');
  console.log(`  excerpt source      : ${tally((p) => p.excerptSource)}`);
  console.log(`  author names        : ${tally((p) => p.author)}`);
  console.log(`  missing cover image : ${noCover.length}${noCover.length ? ` -> ${noCover.map((p) => `#${p.sourceId}`).join(', ')}` : ''}`);
  console.log(`  missing author      : ${noAuthor.length}${noAuthor.length ? ` -> ${noAuthor.map((p) => `#${p.sourceId}`).join(', ')}` : ''}`);
  console.log(`  missing publish date: ${noDate.length}${noDate.length ? ` -> ${noDate.map((p) => `#${p.sourceId}`).join(', ')}` : ''}`);
  console.log(`  missing category    : ${noCategory.length}${noCategory.length ? ` -> ${noCategory.map((p) => `#${p.sourceId}`).join(', ')}` : ''}`);
  console.log(`  has FAQ section     : ${withFaq.length}`);
  console.log(`  no inline images    : ${noInline.length}`);

  console.log('\nDestination constraint checks (Blog schema):');
  console.log(`  title < 5 or > 150  : ${titleTooShort.length + titleTooLong.length}${titleTooShort.length ? ` short -> ${titleTooShort.map((p) => `#${p.sourceId}`).join(', ')}` : ''}${titleTooLong.length ? ` long -> ${titleTooLong.map((p) => `#${p.sourceId}`).join(', ')}` : ''}`);
  console.log(`  excerpt < 10 or > 300: ${excerptTooShort.length + excerptTooLong.length}${excerptTooLong.length ? ` over -> ${excerptTooLong.map((p) => `#${p.sourceId}(${p.excerpt.length})`).join(', ')}` : ''}${excerptTooShort.length ? ` under -> ${excerptTooShort.map((p) => `#${p.sourceId}`).join(', ')}` : ''}`);
  console.log(`  empty/short content : ${noBody.length}${noBody.length ? ` -> ${noBody.map((p) => `#${p.sourceId}`).join(', ')}` : ''}`);
  console.log(`  tags > 8            : ${tooManyTags.length}${tooManyTags.length ? ` -> ${tooManyTags.map((p) => `#${p.sourceId}(${p.tags.length})`).join(', ')}` : ''}`);
  console.log(`  tag longer than 30  : ${longTags.length}`);

  console.log(`\nBody starts by repeating its own title: ${repeats.length}`);
  if (repeats.length) {
    console.log(`  ${repeats.slice(0, 12).map((p) => `#${p.sourceId}(${p.titleRepeat.tag})`).join(', ')}${repeats.length > 12 ? ` … +${repeats.length - 12}` : ''}`);
  }

  if (errors.length) {
    console.log('\n--- errors ---');
    for (const e of errors.slice(0, 25)) console.log(`  [${e.stage}] #${e.postId} ${e.url} -> ${e.message}`);
    if (errors.length > 25) console.log(`  … ${errors.length - 25} more`);
  }

  console.log(`\nWrote ${POSTS_JSON}`);
  console.log(`Images in ${IMAGES_DIR}`);
  console.log('=====================================================');
}

main().catch((error) => {
  console.error('[scrape] fatal:', error);
  process.exitCode = 1;
});
