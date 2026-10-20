/**
 * One-time migration: local MongoDB  ->  MongoDB Atlas.
 *
 * Vercel ke andar aapka local database reach nahi ho sakta, isliye data ko
 * ek hosted cluster pe le jaana padta hai. Ye script source cluster ki saari
 * collections target cluster pe copy karti hai — `_id` values sameta, taaki
 * listings/blogs ke slugs, references aur images (Cloudinary URLs) waise hi
 * kaam karein.
 *
 *   node scripts/migrateToAtlas.js --to "mongodb+srv://..." --dry-run
 *   node scripts/migrateToAtlas.js --to "mongodb+srv://..."
 *
 * Safety: agar target database me pehle se documents hain to script ruk jaati
 * hai. Fresh cluster pe chalane ke liye yahi sahi hai; jaan-boojh kar overwrite
 * karna ho to --force lagao.
 *
 * NOTE: ye ek deployment tool hai, app runtime ka hissa nahi. Migration ke baad
 * ise delete kar sakte ho.
 */
import { MongoClient } from 'mongodb';

const SOURCE_URI = process.env.SOURCE_URI ?? 'mongodb://127.0.0.1:27017/Animals-super-store';
const DB_NAME = process.env.DB_NAME ?? 'Animals-super-store';
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

/** Never print credentials into a terminal or a log. */
function mask(uri) {
  return uri.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');
}

/** `--to <uri>` — Vercel env var ki tarah, credentials command line pe aate hain. */
function readTargetUri() {
  const flag = process.argv.indexOf('--to');
  const uri = flag !== -1 ? process.argv[flag + 1] : process.env.TARGET_URI;

  if (!uri) {
    console.error(
      [
        'Target Atlas URI missing.',
        '',
        '  node scripts/migrateToAtlas.js --to "mongodb+srv://user:pass@cluster.mongodb.net/Animals-super-store"',
        '',
        'Pehle --dry-run se dekh lo ki kitna data copy hoga.',
      ].join('\n')
    );
    process.exit(1);
  }

  if (/127\.0\.0\.1|localhost/i.test(uri)) {
    console.error('Target URI local lag raha hai — wahan migrate karne ka koi matlab nahi.');
    process.exit(1);
  }

  return uri;
}

async function main() {
  const targetUri = readTargetUri();

  console.log('Migration plan');
  console.log(`  From     ${mask(SOURCE_URI)}`);
  console.log(`  To       ${mask(targetUri)}`);
  console.log(`  Database ${DB_NAME}${DRY_RUN ? '   (DRY RUN — kuch likha nahi jayega)' : ''}`);
  console.log('');

  const source = new MongoClient(SOURCE_URI);
  const target = new MongoClient(targetUri);

  try {
    await source.connect();
    console.log('Source connected.');

    const sourceDb = source.db(DB_NAME);
    const collections = await sourceDb.listCollections().toArray();

    if (collections.length === 0) {
      console.error(`Source database "${DB_NAME}" khaali hai — kuch copy karne ko nahi hai.`);
      process.exit(1);
    }

    // Source counts pehle, taaki target ka check aur report dono ek hi data pe ho.
    const plan = [];
    for (const { name } of collections) {
      plan.push({ name, count: await sourceDb.collection(name).countDocuments() });
    }

    console.log('\nSource data');
    for (const { name, count } of plan) {
      console.log(`  ${String(count).padStart(7)}  ${name}`);
    }

    if (DRY_RUN) {
      await target.connect();
      console.log('\nTarget reachable. Dry run complete — kuch nahi likha gaya.');
      return;
    }

    await target.connect();
    console.log('\nTarget connected.');
    const targetDb = target.db(DB_NAME);

    // Guard: ye script ek fresh cluster ke liye hai. Maujooda data pe chalane se
    // duplicate-key errors aur aadha-adhoora merge ban sakta hai.
    if (!FORCE) {
      const existing = [];
      for (const { name } of plan) {
        const count = await targetDb.collection(name).countDocuments();
        if (count > 0) existing.push(`${name} (${count})`);
      }
      if (existing.length > 0) {
        console.error(
          [
            '',
            'Refusing to run: target database already has data.',
            `  ${existing.join(', ')}`,
            '',
            'Ye script ek khaali cluster ke liye bani hai. Agar aap jaan-boojh kar',
            'maujooda data ke upar likhna chahte ho to --force lagao.',
          ].join('\n')
        );
        process.exit(1);
      }
    }

    console.log('\nCopying');
    let total = 0;
    for (const { name, count } of plan) {
      const docs = await sourceDb.collection(name).find({}).toArray();
      if (docs.length > 0) {
        // ordered:false — ek document fail hone par baaki rukne na paayein.
        await targetDb.collection(name).insertMany(docs, { ordered: false });
      }
      const written = await targetDb.collection(name).countDocuments();
      total += written;
      const ok = written === count ? 'ok' : `MISMATCH (expected ${count})`;
      console.log(`  ${String(written).padStart(7)}  ${name}  ${ok}`);
    }

    console.log(`\nDone. ${total} documents copied to "${DB_NAME}".`);
    console.log(
      '\nIndexes (text search sameta) app ke pehle boot pe Mongoose khud bana dega.'
    );
    console.log('Ab Vercel me MONGO_URI set karke redeploy karo.');
  } finally {
    await source.close().catch(() => {});
    await target.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error('\nMigration failed:', error.message);
  process.exit(1);
});
