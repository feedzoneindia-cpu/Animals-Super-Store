/**
 * TEMPORARY (delete after use) — syncs local MongoDB -> MongoDB Atlas.
 *
 * Why this exists alongside migrateToAtlas.js: that script only *inserts*
 * (`insertMany`) and refuses to run against a target that already has data.
 * Atlas already holds a copy of this database, so every insert there collides
 * on `_id` and nothing moves. This script *upserts* instead — each source
 * document replaces its target twin in place, new documents are inserted, and
 * documents that exist only on the target are left alone unless --prune is
 * passed. Re-running it is safe and idempotent.
 *
 *   node scripts/_sync-to-atlas.mjs --dry-run   # report drift, write nothing
 *   node scripts/_sync-to-atlas.mjs             # push local -> Atlas
 *   node scripts/_sync-to-atlas.mjs --prune     # also delete target-only docs
 *
 * Target comes from ATLAS_URI in server/.env; MONGO_URI stays the local source.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const DB = process.env.DB_NAME ?? 'Animals-super-store';
const SOURCE_URI = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/Animals-super-store';
const TARGET_URI = process.env.ATLAS_URI;
const DRY_RUN = process.argv.includes('--dry-run');
const PRUNE = process.argv.includes('--prune');
const BATCH = 400;

const mask = (uri) => uri.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');

/**
 * Order-independent rendering of a BSON document, so two copies of the same
 * data compare equal even when MongoDB returns their keys in a different
 * order. Without this the dry run reports drift that isn't real.
 */
function canon(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (value instanceof Date) return `Date(${value.toISOString()})`;
  if (Buffer.isBuffer(value)) return `BinData(${value.toString('base64')})`;
  const bson = value._bsontype ?? value.constructor?.name;
  if (bson === 'ObjectId') return `ObjectId(${value.toString()})`;
  if (bson === 'Decimal128' || bson === 'Long' || bson === 'Binary') return `${bson}(${value.toString()})`;
  if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canon(value[k])}`).join(',')}}`;
}

async function main() {
  if (!TARGET_URI) {
    console.error('\nserver/.env me ATLAS_URI set nahi hai — target pata nahi chalega.');
    process.exit(1);
  }
  if (/127\.0\.0\.1|localhost/i.test(TARGET_URI)) {
    console.error('\nTarget URI local lag raha hai — wahan sync karne ka koi matlab nahi.');
    process.exit(1);
  }

  console.log('\nSync plan');
  console.log(`  From     ${mask(SOURCE_URI)}`);
  console.log(`  To       ${mask(TARGET_URI)}`);
  console.log(`  Database ${DB}${DRY_RUN ? '   (DRY RUN — kuch likha nahi jayega)' : ''}${PRUNE ? '   [--prune: target-only docs delete honge]' : ''}`);
  console.log('');

  const source = new MongoClient(SOURCE_URI, { serverSelectionTimeoutMS: 10_000 });
  const target = new MongoClient(TARGET_URI, { serverSelectionTimeoutMS: 10_000 });

  try {
    await source.connect();
    await target.connect();
    console.log('Source and target connected.\n');

    const sdb = source.db(DB);
    const tdb = target.db(DB);
    const collections = (await sdb.listCollections().toArray()).map((c) => c.name).sort();

    if (collections.length === 0) {
      console.error(`Source database "${DB}" khaali hai — sync karne ko kuch nahi.`);
      process.exit(1);
    }

    let grandInsert = 0;
    let grandUpdate = 0;
    let grandSame = 0;
    let grandPruned = 0;

    console.log('collection              source  target  ->  insert  update  same' + (PRUNE ? '  prune' : ''));

    for (const name of collections) {
      const docs = await sdb.collection(name).find({}).toArray();
      const existing = await tdb.collection(name).find({}).toArray();
      const targetById = new Map(existing.map((d) => [String(d._id), d]));

      const toInsert = [];
      const toReplace = [];
      let same = 0;

      for (const doc of docs) {
        const twin = targetById.get(String(doc._id));
        if (!twin) {
          toInsert.push(doc);
        } else if (canon(doc) === canon(twin)) {
          same += 1;
        } else {
          toReplace.push(doc);
        }
        targetById.delete(String(doc._id));
      }

      // Whatever is left in the map exists only on the target.
      const orphans = PRUNE ? [...targetById.keys()] : [];

      if (!DRY_RUN) {
        const ops = [
          ...toInsert.map((doc) => ({ insertOne: { document: doc } })),
          ...toReplace.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc } })),
        ];
        for (let i = 0; i < ops.length; i += BATCH) {
          await tdb.collection(name).bulkWrite(ops.slice(i, i + BATCH), { ordered: false });
        }
        if (orphans.length > 0) {
          await tdb.collection(name).deleteMany({
            _id: { $in: orphans.map((id) => targetById.get(id)._id) },
          });
        }
      }

      grandInsert += toInsert.length;
      grandUpdate += toReplace.length;
      grandSame += same;
      grandPruned += orphans.length;

      console.log(
        `${name.padEnd(22)} ${String(docs.length).padStart(6)}  ${String(existing.length).padStart(6)}  ->  ` +
          `${String(toInsert.length).padStart(6)}  ${String(toReplace.length).padStart(6)}  ${String(same).padStart(5)}` +
          (PRUNE ? `  ${String(orphans.length).padStart(5)}` : '')
      );
    }

    console.log('');
    if (DRY_RUN) {
      console.log(
        `Dry run: ${grandInsert} new, ${grandUpdate} changed, ${grandSame} already identical` +
          (PRUNE ? `, ${grandPruned} would be deleted` : '') +
          '. Kuch nahi likha gaya.'
      );
    } else {
      console.log(
        `Done. ${grandInsert} inserted, ${grandUpdate} replaced, ${grandSame} unchanged` +
          (PRUNE ? `, ${grandPruned} deleted` : '') +
          '.'
      );

      // Verify by re-reading the target — never trust the write counts alone.
      console.log('\nVerify (target re-counted):');
      for (const name of collections) {
        const s = await sdb.collection(name).countDocuments();
        const t = await tdb.collection(name).countDocuments();
        console.log(`  ${t === s ? 'ok      ' : 'MISMATCH'} ${String(t).padStart(6)}/${String(s).padStart(6)}  ${name}`);
      }
    }
  } finally {
    await source.close().catch(() => {});
    await target.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error('\nSync failed:', error.message);
  process.exit(1);
});
