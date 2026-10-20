/**
 * TEMPORARY read-only probe (delete after use).
 *
 * Answers two questions before the real migration runs:
 *   1. Does the Atlas target already hold data? (the real script's guard only
 *      fires on a write run, so a dry run cannot tell us this)
 *   2. Which user accounts and seeded sample rows are about to be copied to
 *      production? Demo accounts with published passwords are worth knowing
 *      about before they ship.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const DB = 'Animals-super-store';
const SOURCE = process.env.MONGO_URI;
const TARGET = process.env.ATLAS_URI;

async function counts(uri, label) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  try {
    await client.connect();
    const db = client.db(DB);
    const cols = await db.listCollections().toArray();
    console.log(`\n[${label}] collections: ${cols.length}`);
    for (const { name } of cols) {
      console.log(`  ${String(await db.collection(name).countDocuments()).padStart(7)}  ${name}`);
    }
    if (cols.length === 0) console.log('  (EMPTY — nothing on this target)');
    return db;
  } finally {
    await client.close().catch(() => {});
  }
}

const targetClient = new MongoClient(TARGET, { serverSelectionTimeoutMS: 10_000 });
const sourceClient = new MongoClient(SOURCE, { serverSelectionTimeoutMS: 10_000 });

try {
  await counts(TARGET, 'TARGET (Atlas)');

  await sourceClient.connect();
  const sdb = sourceClient.db(DB);

  console.log('\n[SOURCE] users about to be copied:');
  for (const u of await sdb.collection('users').find({}, { projection: { email: 1, role: 1, status: 1, createdAt: 1 } }).toArray()) {
    const stamp = u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '?';
    console.log(`  ${String(u.role ?? '?').padEnd(6)} ${String(u.status ?? '-').padEnd(8)} ${stamp}  ${u.email}`);
  }

  console.log('\n[SOURCE] seeded sample rows still present:');
  const demoUsers = await sdb.collection('users').countDocuments({
    email: { $in: ['priya@example.com', 'rahul@example.com', 'admin@Animalssuperstore.local'] },
  });
  console.log(`  demo/seed accounts : ${demoUsers}`);
  console.log(`  blogs on picsum CDN: ${await sdb.collection('blogs').countDocuments({ 'coverImage.url': /picsum\.photos/ })}`);
  console.log(`  listings on wikimedia: ${await sdb.collection('listings').countDocuments({ 'images.url': /upload\.wikimedia\.org/ })}`);
} finally {
  await sourceClient.close().catch(() => {});
  await targetClient.close().catch(() => {});
}
