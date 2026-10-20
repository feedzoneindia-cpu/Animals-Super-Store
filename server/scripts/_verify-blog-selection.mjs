/**
 * TEMPORARY read-only (delete after use) — verifies the approved 20-blog
 * selection exists in the database exactly as expected, and reports what a
 * cleanup WOULD delete. Writes nothing.
 *
 *   node scripts/_verify-blog-selection.mjs
 *
 * Title matching lives in _blog-selection.mjs, which folds the two Devanagari
 * encodings of ड़ — see the note at the top of that file.
 */
import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';
import { resolveRetained } from './_blog-selection.mjs';

function isOurCloudinary(url) {
  return typeof url === 'string' && /^https:\/\/res\.cloudinary\.com\//.test(url);
}

/** HEAD/GET the cover so "cover images work" is measured, not assumed. */
async function coverStatus(url) {
  if (!url) return 'NO-URL';
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, { method, redirect: 'follow' });
      if (res.ok) return `OK(${res.status})`;
      if (method === 'GET') return `FAIL(${res.status})`;
    } catch (error) {
      if (method === 'GET') return `ERR(${error.message.slice(0, 40)})`;
    }
  }
  return 'FAIL';
}

const client = new MongoClient(env.mongoUri, { serverSelectionTimeoutMS: 15_000 });
let problems = 0;

try {
  await client.connect();
  const db = client.db();
  const blogs = db.collection('blogs');
  console.log('Database:', db.databaseName);

  const all = await blogs.find({}).toArray();
  const total = all.length;
  console.log('TOTAL BLOGS IN COLLECTION:', total);
  console.log('BY STATUS:', JSON.stringify(
    all.reduce((acc, b) => { acc[b.status] = (acc[b.status] ?? 0) + 1; return acc; }, {}),
  ));

  const { retained, missing, ambiguous, matchedVia } = resolveRetained(all);

  console.log(`\n================ RETAINED ${retained.length}/20 ================`);
  for (const m of matchedVia) {
    const b = retained.find((r) => r.slug === m.slug);
    const cover = b.coverImage?.url ?? '';
    const pub = b.coverImage?.publicId ?? '';
    console.log(`\n${b._id}`);
    console.log(`  title   : ${b.title}`);
    console.log(`  matched : via "${m.via}"${m.via === 'exact' ? '' : ` (approved string used different code points)`}`);
    console.log(`  slug    : ${b.slug}`);
    console.log(`  cat     : ${b.category ?? '(none)'}   status: ${b.status}`);
    console.log(`  content : ${(b.content ?? '').length} chars`);
    console.log(`  cover   : ${cover || '(none)'}`);
    console.log(`  publicId: ${pub || '(none)'}`);
    console.log(`  http    : ${await coverStatus(cover)}${isOurCloudinary(cover) ? '' : '   <-- NOT our Cloudinary'}`);
  }

  console.log('\n================ PROBLEMS ================');
  if (missing.length) { problems += missing.length; console.log(`MISSING (${missing.length}):`); for (const t of missing) console.log(`  - ${t}`); }
  if (ambiguous.length) { problems += ambiguous.length; console.log(`AMBIGUOUS (${ambiguous.length}):`); for (const a of ambiguous) console.log(`  - via ${a.via}, x${a.n}  ${a.title}`); }

  const noCover = retained.filter((b) => !b.coverImage?.url);
  if (noCover.length) { problems += noCover.length; console.log(`RETAINED WITHOUT COVER (${noCover.length}):`); for (const b of noCover) console.log(`  - ${b.title}`); }

  const notOurs = retained.filter((b) => b.coverImage?.url && !isOurCloudinary(b.coverImage.url));
  if (notOurs.length) { console.log(`COVER NOT ON OUR CLOUDINARY (${notOurs.length}):`); for (const b of notOurs) console.log(`  - ${b.title} -> ${b.coverImage.url}`); }

  const unpublished = retained.filter((b) => b.status !== 'published');
  if (unpublished.length) { problems += unpublished.length; console.log(`RETAINED NOT PUBLISHED (${unpublished.length}):`); for (const b of unpublished) console.log(`  - ${b.title} [${b.status}]`); }

  // ---- slug uniqueness across the WHOLE collection ----
  const slugCounts = new Map();
  for (const b of all) slugCounts.set(b.slug, (slugCounts.get(b.slug) ?? 0) + 1);
  const dupSlugs = [...slugCounts.entries()].filter(([, n]) => n > 1);
  console.log(`\nSLUG COLLISIONS IN COLLECTION: ${dupSlugs.length}`);
  for (const [slug, n] of dupSlugs.slice(0, 20)) console.log(`  x${n}  ${slug}`);

  const retainedSlugs = new Set(retained.map((b) => b.slug));
  console.log(`UNIQUE SLUGS AMONG THE 20: ${retainedSlugs.size} (expected ${retained.length})`);
  if (retainedSlugs.size !== retained.length) problems += 1;

  // ---- what would be deleted ----
  const retainedIds = new Set(retained.map((b) => String(b._id)));
  const toDelete = all.filter((b) => !retainedIds.has(String(b._id)));

  const withPublicId = toDelete.filter((b) => b.coverImage?.publicId);
  const orphanCover = toDelete.filter((b) => b.coverImage?.url && !b.coverImage?.publicId);
  const noCoverAtAll = toDelete.filter((b) => !b.coverImage?.url && !b.coverImage?.publicId);

  console.log('\n================ DELETION PLAN ================');
  console.log(`Total blogs before      : ${total}`);
  console.log(`Retained                : ${retained.length}`);
  console.log(`To delete permanently   : ${toDelete.length}`);
  console.log(`  with Cloudinary publicId : ${withPublicId.length}`);
  console.log(`  cover url but NO publicId: ${orphanCover.length}  (untracked — doc deleted, asset left alone)`);
  console.log(`  no cover at all          : ${noCoverAtAll.length}`);
  console.log(`Expected count after    : ${retained.length}`);
  if (orphanCover.length) {
    console.log('\n  Untracked covers (first 10):');
    for (const b of orphanCover.slice(0, 10)) console.log(`    - ${b.title} -> ${b.coverImage.url}`);
  }

  console.log(`\nVERDICT: ${problems === 0 && retained.length === 20 ? 'SAFE TO PROCEED' : 'PROBLEMS FOUND — DO NOT DELETE'}`);
} catch (error) {
  console.error('FAILED:', error.message);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
