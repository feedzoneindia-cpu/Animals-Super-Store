/**
 * TEMPORARY read-only (delete after use) — lists every local database and its
 * per-collection document counts.
 *
 * Needed because server/.env's MONGO_URI has changed between runs, so it is no
 * longer obvious which local database actually holds the current data — and a
 * sync run against the wrong one reports "0 changed" while proving nothing.
 */
import { MongoClient } from 'mongodb';

const IGNORED = new Set(['admin', 'local', 'config']);

const client = new MongoClient('mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 5_000 });

try {
  await client.connect();
  const { databases } = await client.db('admin').admin().listDatabases();

  const names = databases
    .map((d) => d.name)
    .filter((n) => !IGNORED.has(n))
    .sort();

  if (names.length === 0) {
    console.log('Koi local database nahi mila.');
  }

  for (const name of names) {
    const db = client.db(name);
    const cols = (await db.listCollections().toArray()).map((c) => c.name).sort();
    let total = 0;
    const lines = [];
    for (const col of cols) {
      const n = await db.collection(col).countDocuments();
      total += n;
      lines.push(`    ${String(n).padStart(7)}  ${col}`);
    }
    console.log(`\n[${name}]  ${total} documents total`);
    console.log(lines.length > 0 ? lines.join('\n') : '    (khaali)');
  }
} catch (error) {
  console.error('Local MongoDB unreachable:', error.message);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
