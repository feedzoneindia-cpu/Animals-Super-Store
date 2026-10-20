/**
 * TEMPORARY (delete after use) — one-off cleanup: keep EXACTLY the approved 20
 * published blogs and permanently delete every other Blog document, along with
 * the Cloudinary cover assets that belong to them.
 *
 * Dry run unless --commit is passed.
 *
 *   node scripts/_cleanup-blogs.mjs             # plan only, no writes
 *   node scripts/_cleanup-blogs.mjs --commit    # delete (irreversible)
 *
 * Safety rules, in order:
 *   1. all 20 approved titles must resolve to exactly one document each, all
 *      published, with unique slugs — otherwise nothing is touched
 *   2. only Cloudinary publicIds inside our blog folder are destroyed; anything
 *      outside it is reported as untracked and left alone
 *   3. cover assets are destroyed before documents, and a run that aborts at
 *      step 1 reaches neither
 *
 * Title matching lives in _blog-selection.mjs, which folds the two Devanagari
 * encodings of ड़ — see the note at the top of that file.
 */
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary.js';
import { env } from '../config/env.js';
import Blog from '../models/Blog.js';
import { resolveRetained } from './_blog-selection.mjs';

const COMMIT = process.argv.includes('--commit');

/**
 * Blog covers live under these folders. A publicId outside them belongs to
 * something else (a listing image, an avatar) and must not be destroyed.
 */
const ALLOWED_FOLDERS = ['Animals-super-store/blog/', 'Animals-super-store/blogs/'];

function isDeletableAsset(publicId) {
  return typeof publicId === 'string' && ALLOWED_FOLDERS.some((f) => publicId.startsWith(f));
}

async function main() {
  console.log(`[cleanup] mode: ${COMMIT ? 'COMMIT (permanent deletion)' : 'DRY RUN (no writes)'}`);

  await mongoose.connect(env.mongoUri);
  const db = mongoose.connection.db;
  console.log('[cleanup] database:', db.databaseName);

  const all = await Blog.find({});
  const totalBefore = all.length;

  // ---- 1. resolve the approved 20 -------------------------------------------
  const { retained, missing, ambiguous, matchedVia } = resolveRetained(all);

  const notPublished = retained.filter((b) => b.status !== 'published');
  const slugSet = new Set(retained.map((b) => b.slug));

  if (missing.length || ambiguous.length || retained.length !== 20 || notPublished.length || slugSet.size !== retained.length) {
    console.error('\nABORT — the approved selection did not verify:');
    if (missing.length) { console.error(`  missing (${missing.length}):`); for (const t of missing) console.error(`    - ${t}`); }
    if (ambiguous.length) { console.error(`  ambiguous titles (${ambiguous.length}):`); for (const a of ambiguous) console.error(`    - via ${a.via}, x${a.n}  ${a.title}`); }
    if (retained.length !== 20) console.error(`  resolved ${retained.length}/20 documents`);
    if (notPublished.length) { console.error(`  not published (${notPublished.length}):`); for (const b of notPublished) console.error(`    - ${b.title} [${b.status}]`); }
    if (slugSet.size !== retained.length) console.error(`  slugs not unique: ${slugSet.size} distinct across ${retained.length} docs`);
    console.error('\nNothing was deleted.');
    process.exitCode = 1;
    return;
  }

  const fuzzy = matchedVia.filter((m) => m.via !== 'exact');
  const notOurs = retained.filter((b) => b.coverImage?.url && !/^https:\/\/res\.cloudinary\.com\//.test(b.coverImage.url));
  const noCover = retained.filter((b) => !b.coverImage?.url);
  if (noCover.length) console.warn(`WARNING: ${noCover.length} retained blog(s) have no cover image.`);
  if (notOurs.length) console.warn(`WARNING: ${notOurs.length} retained cover(s) are not on our Cloudinary.`);

  // ---- 2. work out what goes ------------------------------------------------
  const retainedIds = retained.map((b) => b._id);
  const doomed = await Blog.find({ _id: { $nin: retainedIds } })
    .select('_id title slug status coverImage')
    .lean();

  const assets = doomed.filter((b) => isDeletableAsset(b.coverImage?.publicId));
  const untracked = doomed.filter((b) => b.coverImage?.url && !isDeletableAsset(b.coverImage?.publicId));
  const orphan = doomed.filter((b) => !b.coverImage?.url && !b.coverImage?.publicId);

  // ---- 3. the safety check the plan requires --------------------------------
  console.log('\n================ RETAINED (20) ================');
  retained.forEach((b, i) => {
    const via = matchedVia[i].via;
    console.log(`${String(i + 1).padStart(2)}. ${b._id}  ${b.slug}${via === 'exact' ? '' : `   [matched via ${via}]`}`);
  });
  console.log(`unique slugs amongst retained: ${slugSet.size}/20`);
  if (fuzzy.length) {
    console.log('\nTitles that needed a normalised match (same text, different code points):');
    for (const m of fuzzy) console.log(`  - stored: ${m.stored}\n    via   : ${m.via}`);
  }

  console.log('\n================ DELETION PLAN ================');
  console.log(`Total blogs before        : ${totalBefore}`);
  console.log(`Retained                  : ${retained.length}`);
  console.log(`To delete permanently     : ${doomed.length}`);
  console.log(`  Cloudinary assets to delete : ${assets.length}`);
  console.log(`  untracked covers (left alone): ${untracked.length}`);
  console.log(`  no cover at all             : ${orphan.length}`);
  console.log(`Expected blogs after      : ${retained.length}`);

  if (untracked.length) {
    console.log('\nUntracked covers (document deleted, asset not touched):');
    for (const b of untracked) console.log(`  - ${b.title} -> ${b.coverImage.url}`);
  }

  if (!COMMIT) {
    console.log('\nDRY RUN — nothing deleted. Re-run with --commit to proceed.');
    return;
  }

  // ---- 4. destroy the cover assets ------------------------------------------
  console.log(`\n[cleanup] destroying ${assets.length} Cloudinary asset(s)…`);
  const destroyed = { ok: 0, notFound: 0, failed: 0 };
  const failures = [];
  for (const blog of assets) {
    const publicId = blog.coverImage.publicId;
    try {
      const res = await cloudinary.uploader.destroy(publicId);
      if (res?.result === 'ok') destroyed.ok += 1;
      else if (res?.result === 'not found') destroyed.notFound += 1;
      else { destroyed.failed += 1; failures.push(`${publicId} -> ${res?.result}`); }
    } catch (error) {
      destroyed.failed += 1;
      failures.push(`${publicId} -> ${error.message}`);
    }
  }
  console.log(`[cleanup] destroyed ${destroyed.ok}, already gone ${destroyed.notFound}, failed ${destroyed.failed}`);
  for (const f of failures.slice(0, 20)) console.log(`  [cloudinary] ${f}`);

  // ---- 5. delete the documents ----------------------------------------------
  const result = await Blog.deleteMany({ _id: { $nin: retainedIds } });
  console.log(`[cleanup] deleted ${result.deletedCount} Blog document(s)`);

  // ---- 6. verify -------------------------------------------------------------
  const totalAfter = await Blog.countDocuments();
  const publishedAfter = await Blog.countDocuments({ status: 'published' });
  console.log('\n================ RESULT ================');
  console.log(`Total blogs before : ${totalBefore}`);
  console.log(`Total blogs after  : ${totalAfter}`);
  console.log(`Deleted            : ${result.deletedCount}`);
  console.log(`Retained           : ${totalAfter}`);
  console.log(`Published after    : ${publishedAfter}`);
  console.log(`Cloudinary deleted : ${destroyed.ok} (already gone ${destroyed.notFound}, failed ${destroyed.failed})`);
  console.log(`Untracked assets   : ${untracked.length}`);
  console.log(`Final count is 20  : ${totalAfter === 20 ? 'YES' : 'NO — INVESTIGATE'}`);
}

main()
  .catch((error) => {
    console.error('[cleanup] fatal:', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect().catch(() => {}));
