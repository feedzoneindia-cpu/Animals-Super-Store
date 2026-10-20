/**
 * TEMPORARY read-only probe (delete after use).
 *
 * Question: server/.env ka MONGO_URI kisi database name ke bina hai
 * (`...mongodb.net/?appName=Cluster0`). Mongoose aisi URI pe MongoDB ke
 * default `test` database me land karta hai — isliye app `Animals-super-store`
 * ka data dekhta hi nahi, chahe Atlas me wo maujood ho.
 *
 * Ye script bilkul wahi karti hai jo app karti hai (env.mongoUri se connect),
 * aur phir batati hai ki connection kis database pe landa aur usme kya hai.
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { env } from '../config/env.js';

/** Credentials kabhi terminal me print na hon. */
const mask = (uri) => uri.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');

const pathPart = (uri) => {
  const afterHost = uri.split('.net/')[1] ?? uri.split('.mongodb.net/')[1] ?? '';
  return afterHost.split('?')[0];
};

console.log('\nMONGO_URI (masked):', mask(env.mongoUri));
console.log('URI path (database name):', pathPart(env.mongoUri) || '(khaali — koi db name nahi)');

await connectDatabase();

const conn = mongoose.connection;
console.log('\n>>> Mongoose landed on database:', JSON.stringify(conn.name), 'host:', conn.host);

const collections = await conn.db.listCollections().toArray();
console.log(`\n[${conn.name}] collections: ${collections.length}`);
for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
  const n = await conn.db.collection(name).countDocuments();
  console.log(`  ${String(n).padStart(7)}  ${name}`);
}
if (collections.length === 0) console.log('  (EMPTY — is database me kuch nahi hai)');

// Side-by-side: what the app sees vs where the data actually is.
const appDb = conn.name;
const realDb = 'Animals-super-store';

console.log('\n--- Side by side ---');
for (const name of [appDb, realDb]) {
  const db = conn.client.db(name);
  const blogCount = await db.collection('blogs').countDocuments().catch(() => 'n/a');
  const listingCount = await db.collection('listings').countDocuments().catch(() => 'n/a');
  const userCount = await db.collection('users').countDocuments().catch(() => 'n/a');
  console.log(`  ${name.padEnd(22)} blogs=${String(blogCount).padStart(5)}  listings=${String(listingCount).padStart(5)}  users=${String(userCount).padStart(4)}`);
}

await mongoose.disconnect();
