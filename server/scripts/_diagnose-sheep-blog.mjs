/**
 * TEMPORARY READ-ONLY diagnostic (delete after use). Writes nothing.
 *
 * Question: the approved sheep article does not resolve. Where is it in the
 * database, and exactly which code points does its title use?
 *
 * Searches by exact title, NFC, NFKC, slug, and partial matches under both
 * Devanagari encodings of ड़, printing full code points for every hit, then
 * reports which matching strategy resolves the whole approved set.
 */
import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';
import { RETAIN, resolveRetained, skeleton, codePoints } from './_blog-selection.mjs';

/** The two spellings of "भेड़", spelled out by code point. */
const DECOMPOSED = 'भेड़';   // dda + nukta
const PRECOMPOSED = 'भेड़';        // dda-with-nukta
const SHEEP_APPROVED = RETAIN.find((t) => skeleton(t) === skeleton('भेड़ पालन व्यापार'));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function show(doc, label) {
  const cover = doc.coverImage ?? {};
  console.log(`\n  [${label}] ${doc._id}`);
  console.log(`    title     : ${doc.title}`);
  console.log(`    codepoints: ${codePoints(doc.title)}`);
  console.log(`    slug      : ${doc.slug}`);
  console.log(`    slug cp   : ${codePoints(doc.slug)}`);
  console.log(`    status    : ${doc.status}   category: ${doc.category}`);
  console.log(`    cover     : ${cover.url || '(none)'}`);
  console.log(`    publicId  : ${cover.publicId || '(none)'}`);
}

const client = new MongoClient(env.mongoUri, { serverSelectionTimeoutMS: 15_000 });

try {
  await client.connect();
  const db = client.db();
  const blogs = db.collection('blogs');
  console.log('Database:', db.databaseName);
  console.log('Total blogs:', await blogs.countDocuments());

  // ---------------------------------------------------------------- approved string
  console.log('\n================ APPROVED SELECTION STRING ================');
  console.log('literal    :', SHEEP_APPROVED);
  console.log('codepoints :', codePoints(SHEEP_APPROVED));
  console.log('NFC        :', codePoints(SHEEP_APPROVED.normalize('NFC')));
  console.log('NFKC       :', codePoints(SHEEP_APPROVED.normalize('NFKC')));
  console.log('NFD        :', codePoints(SHEEP_APPROVED.normalize('NFD')));
  console.log('skeleton   :', skeleton(SHEEP_APPROVED));

  const ref = {
    'भेड़ decomposed': DECOMPOSED,
    'भेड़ precomposed': PRECOMPOSED,
  };
  for (const [label, s] of Object.entries(ref)) {
    console.log(`${label.padEnd(18)}: ${codePoints(s)}  NFC=${codePoints(s.normalize('NFC'))}  NFKC=${codePoints(s.normalize('NFKC'))}`);
  }
  console.log('decomposed === precomposed      :', DECOMPOSED === PRECOMPOSED);
  console.log('decomposed NFC === precomposed NFC  :', DECOMPOSED.normalize('NFC') === PRECOMPOSED.normalize('NFC'));
  console.log('decomposed NFKC === precomposed NFKC:', DECOMPOSED.normalize('NFKC') === PRECOMPOSED.normalize('NFKC'));
  console.log('skeleton equal                  :', skeleton(DECOMPOSED) === skeleton(PRECOMPOSED));
  console.log('skeleton of भेड़               :', skeleton(DECOMPOSED));

  // ---------------------------------------------------------------- searches
  const searches = [
    ['1. exact title', { title: SHEEP_APPROVED }],
    ['2. NFC-normalised title', { title: SHEEP_APPROVED.normalize('NFC') }],
    ['3. NFKC-normalised title', { title: SHEEP_APPROVED.normalize('NFKC') }],
    ['4. precomposed title literal', { title: PRECOMPOSED + ' पालन व्यापार' }],
    ['5. slug exact', { slug: SHEEP_APPROVED.replace(/ /g, '-') }],
    ['6. slug regex /vyapar|व्यापार/', { slug: { $regex: esc('व्यापार') } }],
    ['7. title regex /भेड़/ (decomposed)', { title: { $regex: esc(DECOMPOSED) } }],
    ['8. title regex /भेड़/ (precomposed)', { title: { $regex: esc(PRECOMPOSED) } }],
    ['9. title regex /पालन व्यापार/', { title: { $regex: esc('पालन व्यापार') } }],
    ['10. title regex /Sheep/i', { title: { $regex: 'Sheep', $options: 'i' } }],
    ['11. title regex /भे/ (any form)', { title: { $regex: 'भे' } }],
  ];

  for (const [label, filter] of searches) {
    const hits = await blogs.find(filter).toArray();
    console.log(`\n================ SEARCH ${label} — ${hits.length} hit(s) ================`);
    if (hits.length === 0) { console.log('  (none)'); continue; }
    hits.slice(0, 10).forEach((d) => show(d, label));
  }

  // ---------------------------------------------------------------- full resolution
  console.log('\n================ RESOLUTION OF ALL 20 ================');
  const all = await blogs.find({}).toArray();
  const { retained, missing, ambiguous, matchedVia } = resolveRetained(all);

  for (const m of matchedVia) {
    const flag = m.via === 'exact' ? '   ' : ' * ';
    console.log(`${flag}[${m.via.padEnd(8)}] ${m.slug}`);
    if (m.via !== 'exact') console.log(`      stored title: ${m.stored}`);
  }
  console.log(`\nresolved  : ${retained.length}/20`);
  console.log(`missing   : ${missing.length}${missing.length ? ' -> ' + missing.join(' | ') : ''}`);
  console.log(`ambiguous : ${ambiguous.length}${ambiguous.length ? ' -> ' + JSON.stringify(ambiguous) : ''}`);
  console.log(`(* = matched by a normalised/fallback strategy, not an exact string)`);

  const total = await blogs.countDocuments();
  console.log(`\ntotal before: ${total}   retained: ${retained.length}   to delete: ${total - retained.length}`);
  console.log(`VERDICT: ${retained.length === 20 && missing.length === 0 && ambiguous.length === 0 ? 'SAFE TO PROCEED' : 'PROBLEMS FOUND'}`);
} catch (error) {
  console.error('FAILED:', error.message);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
