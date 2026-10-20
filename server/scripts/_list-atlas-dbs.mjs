/**
 * TEMPORARY read-only (delete after use) — lists every database on the Atlas
 * cluster with its per-collection document counts.
 *
 * Why: the connection string in server/.env carries no database name in its
 * path (`...mongodb.net/?appName=Cluster0`), so anything that connects without
 * an explicit db name lands in MongoDB's default `test` database. Atlas UI then
 * opens `test` first and the real data looks missing. This lists what is
 * actually where.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const IGNORED = new Set(['admin', 'local', 'config']);

const uri = process.env.ATLAS_URI;
if (!uri) {
  console.error('server/.env me ATLAS_URI set nahi hai.');
  process.exit(1);
}

const cluster = uri.match(/@([^/?]+)/)?.[1] ?? '(unknown host)';
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });

try {
  await client.connect();
  console.log(`\nCluster: ${cluster}`);
  console.log(`Path in URI: ${uri.includes('.net/') && uri.split('.net/')[1].split('?')[0] ? uri.split('.net/')[1].split('?')[0] : '(koi database name nahi — default `test` use hoga)'}`);

  const { databases } = await client.db('admin').admin().listDatabases();
  const names = databases.map((d) => d.name).filter((n) => !IGNORED.has(n)).sort();

  if (names.length === 0) console.log('\nCluster pe koi user database nahi hai — bilkul khaali.');

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
  console.error('\nAtlas unreachable:', error.message);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
