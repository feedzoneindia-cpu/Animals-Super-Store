/**
 * TEMPORARY read-only (delete after use) — dumps every blog record so we can
 * pick the final 20. Prints title, category, tags, status, slug, cover image
 * presence and content length, plus a count summary.
 */
import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';

const client = new MongoClient(env.mongoUri, { serverSelectionTimeoutMS: 15_000 });

try {
  await client.connect();
  const db = client.db(); // database name comes from the URI path
  console.log('Connected to database:', db.databaseName);

  const blogs = await db
    .collection('blogs')
    .find({}, {
      projection: {
        title: 1, slug: 1, category: 1, tags: 1, status: 1,
        publishedAt: 1, coverImage: 1, excerpt: 1, content: 1, createdAt: 1,
      },
    })
    .sort({ publishedAt: -1, createdAt: -1 })
    .toArray();

  console.log('TOTAL BLOGS:', blogs.length);

  const byStatus = {};
  const byCategory = {};
  for (const b of blogs) {
    byStatus[b.status ?? '(none)'] = (byStatus[b.status ?? '(none)'] ?? 0) + 1;
    byCategory[b.category ?? '(none)'] = (byCategory[b.category ?? '(none)'] ?? 0) + 1;
  }
  console.log('\nBY STATUS:', JSON.stringify(byStatus));
  console.log('BY CATEGORY:');
  for (const [k, v] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(4)}  ${k}`);
  }

  console.log('\n--- EVERY BLOG ---');
  blogs.forEach((b, i) => {
    const hasCover = b.coverImage?.url ? 'IMG' : 'no-img';
    const len = (b.content ?? '').length;
    const published = b.publishedAt ? new Date(b.publishedAt).toISOString().slice(0, 10) : '-';
    console.log(
      `${String(i + 1).padStart(3)}. [${b.status}] [${hasCover}] len=${String(len).padStart(5)} pub=${published}`
    );
    console.log(`     title: ${b.title}`);
    console.log(`     slug:  ${b.slug}`);
    console.log(`     cat:   ${b.category}   tags: ${(b.tags ?? []).join(', ')}`);
    console.log(`     exc:   ${(b.excerpt ?? '').slice(0, 140)}`);
  });

  // Duplicate title detection (normalized)
  const norm = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const seen = new Map();
  for (const b of blogs) {
    const k = norm(b.title);
    if (!seen.has(k)) seen.set(k, []);
    seen.get(k).push(b);
  }
  console.log('\n--- DUPLICATE / NEAR-DUPLICATE TITLES ---');
  let dupCount = 0;
  for (const [k, group] of seen) {
    if (group.length > 1) {
      dupCount++;
      console.log(`  x${group.length}  ${k}`);
      for (const g of group) console.log(`       - ${g.slug}  [${g.status}]  ${g.title}`);
    }
  }
  if (dupCount === 0) console.log('  (none)');
} catch (error) {
  console.error('FAILED:', error.message);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
