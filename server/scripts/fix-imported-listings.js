#!/usr/bin/env node
/**
 * One-off cleanup for the Phase 2 import (scrape-products.js ->
 * import-scraped-products.js).
 *
 *   1. Slug fix  — a title that is partly Devanagari slugifies to just its
 *      ASCII fragment (#28 "5XG गोट वेट गेनर" -> "5xg"). Those become
 *      `product-<sourceId>`, matching the other Hindi-titled listings.
 *   2. Description cleanup — the source page repeats the product name as a
 *      heading at the top of the description block. This removes that repeat,
 *      leaving only the description prose. A few pages use a heading that is
 *      not the stored title; those are listed in MANUAL_HEADINGS below.
 *
 * Safe by default: dry run, prints what it would change. --commit writes.
 *
 *   node src/scripts/fix-imported-listings.js                 # preview
 *   node src/scripts/fix-imported-listings.js --all           # every change
 *   node src/scripts/fix-imported-listings.js --show=3,10     # full before/after
 *   node src/scripts/fix-imported-listings.js --commit        # apply
 *
 * Scope is deliberately narrow: only listings owned by the importer's seller
 * account AND whose slug is one this import produced. The 17 seeded listings
 * (owned by other users) are never touched.
 *
 * Idempotent — both fixes are derived from the listing's own text, so a second
 * run reports "no change" for everything.
 */
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { slugify } from '../utils/slug.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_JSON = path.join(__dirname, 'scraped-data', 'products.json');

const MAX_DESCRIPTION = 5000;
const MIN_DESCRIPTION = 20;
/** Safety valve — a title repeat never legitimately stacks this deep. */
const MAX_STRIP_PASSES = 4;

const COMMIT = process.argv.slice(2).includes('--commit');
/** Print every change rather than a 3-line sample. */
const SHOW_ALL = process.argv.slice(2).includes('--all');
/** Full before/after for specific source ids, e.g. --show=3,10. */
const SHOW_IDS = (process.argv.slice(2).find((a) => a.startsWith('--show=')) ?? '')
  .slice('--show='.length)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ---------------------------------------------------------------------------
// Text matching
// ---------------------------------------------------------------------------
/**
 * Same character set the two strings are compared in: letters and digits.
 * Case-insensitive — `norm()` lowercases, so an uppercase word must count as a
 * word char here or it would be dropped as a separator ("AMS PRELIFE" -> "").
 */
const WORD_CHAR = /[a-z0-9ऀ-ॿ]/i;
const DEVANAGARI = /[ऀ-ॿ]/;
/** Leftover separators once the heading itself has been cut away. */
const LEADING_JUNK = /^[\s​-‍?)\]}:;,.।|/\\–—-]+/;

/**
 * Hindi case markers bind to the noun in front of them, so they can never open
 * a sentence. Finding one right after a name means the name was the subject of
 * the sentence ("… सॉल्ट ब्लॉक को पाकिस्तान की … काटा जाता है"), not a repeated
 * heading — the Hindi counterpart of the lowercase check below, which cannot
 * work here because Devanagari has no letter case.
 */
const CASE_MARKERS = new Set(['का', 'की', 'के', 'को']);
const startsWithCaseMarker = (text) => {
  const first = text.split(/\s+/)[0]?.replace(/[।,.?!]+$/, '') ?? '';
  return CASE_MARKERS.has(first);
};

/** Comparison form: case-folded, punctuation dropped, whitespace collapsed. */
const norm = (s) => {
  let out = '';
  let needSpace = false;
  for (const ch of String(s)) {
    if (WORD_CHAR.test(ch)) {
      if (needSpace) out += ' ';
      out += ch.toLowerCase();
      needSpace = false;
    } else {
      needSpace = out.length > 0;
    }
  }
  return out;
};

/**
 * How many characters of `text` make up the heading `target`, or 0 if `text`
 * does not open with it.
 *
 * Matching is fuzzy on purpose — case, spacing and punctuation differ between
 * the stored title and the heading on the page ("Premium Black salt Block" vs
 * "Premium Black Salt Block", "गोल्ड-यूटी ( यू-टोन )" vs "गोल्ड-यूटी (यू-टोन)").
 * It is deliberately NOT fuzzy about wording: the walk bails as soon as the
 * text diverges from the title, so "Hari Patti for Animalss" is not mistaken for
 * the title "Hari Patti for Goats" and cut in half.
 */
function headingEnd(text, target) {
  const nTarget = norm(target);
  if (!nTarget) return 0;
  let out = '';
  let needSpace = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (WORD_CHAR.test(ch)) {
      if (needSpace) out += ' ';
      out += ch.toLowerCase();
      needSpace = false;
      if (out === nTarget) return i + 1;
      if (!nTarget.startsWith(out)) return 0;
    } else {
      needSpace = out.length > 0;
    }
  }
  return 0;
}

/**
 * The heading some pages use instead of the full title: the part before the
 * parenthetical qualifier (#55's title is "AMS BATISA ( APPETITE STIMULANT … )"
 * but its description opens with just "AMS BATISA").
 */
function shortHeading(title) {
  const base = String(title).split('(')[0].trim();
  if (!base || base === title.trim()) return null;
  return base.split(/\s+/).length >= 2 ? base : null;
}

/**
 * Headings that differ from the stored title, so the title match below can
 * never reach them. Each was read and confirmed by hand; the value is the
 * exact heading sitting at the top of that product's description.
 *
 * #3  — page heading is "Hari Patti for Animalss", the title is
 *       "Hari Patti for Goats": only the last word differs, and matching a
 *       prefix of the title would cut the heading in half ("Hari Patti for").
 * #10 — page heading is the Devanagari "सेंधा नमक।", the title is the Latin
 *       transliteration "sendha namak"; the two can't be matched to each other.
 *
 * #11 (Moongfali Bhoosa) is deliberately absent: its description opens with
 * "Peanut Straw For Animalss", a different phrase rather than a repeat of the
 * name, so it is left exactly as it was.
 */
const MANUAL_HEADINGS = new Map([
  ['3', 'Hari Patti for Animalss'],
  ['10', 'सेंधा नमक।'],
]);

/**
 * Removes the repeated product name from the top of a description.
 *
 * Returns `{ text, removed, stoppedBy, manual }`:
 *   removed   — headings that were cut, in order
 *   stoppedBy — a heading was found but kept, because the words after it bind
 *               to it grammatically, so it is the subject of the sentence
 *               rather than a repeated heading.
 *   manual    — the cut used a hand-supplied heading instead of the title
 */
function stripLeadingTitle(description, title, manualHeading = null) {
  // A hand-supplied heading replaces the title match entirely for that product.
  const candidates = manualHeading ? [manualHeading] : [title, shortHeading(title)].filter(Boolean);
  const hasLatin = /[a-z]/i.test(manualHeading ?? title);

  let text = description;
  const removed = [];
  let stoppedBy = null;

  for (let pass = 0; pass < MAX_STRIP_PASSES; pass += 1) {
    let hit = 0;
    for (const candidate of candidates) {
      const end = headingEnd(text, candidate);
      if (end > hit) hit = end;
    }
    if (!hit) break;

    const rest = text.slice(hit).replace(LEADING_JUNK, '');

    // A lowercase word straight after the name means the "heading" was really
    // the subject of the sentence — cutting it would leave a broken fragment.
    if (hasLatin && /^[a-z]/.test(rest)) {
      stoppedBy = 'latin-continuation';
      break;
    }
    if (startsWithCaseMarker(rest)) {
      stoppedBy = 'case-marker';
      break;
    }

    removed.push(text.slice(0, hit).trim());
    // Drop a heading fragment left behind by the title, e.g. the
    // "( FOR ACIDITY )" in #44. Only ever a short parenthetical, and only
    // immediately after the heading we just removed.
    text = rest.replace(/^\([^)]{1,40}\)\s*/, '');
    if (!text) break;
  }

  return { text, removed, stoppedBy, manual: Boolean(manualHeading && removed.length) };
}

// ---------------------------------------------------------------------------
// Slug rule — a name that contains Devanagari keeps only an ASCII fragment
// through slugify(), so those fall back to an id-based slug.
// ---------------------------------------------------------------------------
function correctedSlug(product) {
  const ascii = slugify(product.name);
  if (DEVANAGARI.test(product.name) && ascii) return `product-${product.sourceId}`;
  return null; // no correction
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const raw = JSON.parse(await fs.readFile(PRODUCTS_JSON, 'utf8'));
  const products = raw.products;
  const sourceIds = new Set(products.map((p) => p.sourceId));

  console.log(`[fix] mode: ${COMMIT ? 'COMMIT (writes to DB)' : 'DRY RUN (no writes)'}`);

  await mongoose.connect(env.mongoUri);
  const seller = await User.findOne({ role: 'ADMIN' }).sort({ createdAt: 1 });
  if (!seller) throw new Error('No ADMIN user found — nothing to scope the import to.');

  const owned = await Listing.find({ seller: seller._id })
    .select('slug title description')
    .lean();
  console.log(`[fix] listings owned by ${seller.name}: ${owned.length}`);

  // Belt and braces: only listings whose slug this import produced are in
  // scope, so a hand-made listing by the same account would be left alone.
  // Both spellings count — the slug fix below rewrites some of these, and a
  // listing that has already been rewritten must stay in scope.
  const importedSlugs = new Set();
  for (const p of products) {
    importedSlugs.add(slugify(p.name) || `product-${p.sourceId}`);
    const fixed = correctedSlug(p);
    if (fixed) importedSlugs.add(fixed);
  }

  const inScope = owned.filter((l) => importedSlugs.has(l.slug));
  if (inScope.length !== owned.length) {
    console.log(
      `[fix] NOTE: ${owned.length - inScope.length} listing(s) of this account did not come from the import — left alone.`
    );
  }

  // Map each listing back to its scraped product by slug.
  const productBySlug = new Map();
  for (const p of products) {
    for (const key of [slugify(p.name), `product-${p.sourceId}`]) {
      if (key && !productBySlug.has(key)) productBySlug.set(key, p);
    }
  }

  const slugChanges = [];
  const descChanges = [];
  const descUnchanged = [];
  const descSkipped = [];
  const problematic = [];
  const untraceable = [];

  for (const l of inScope) {
    const product = productBySlug.get(l.slug);
    if (!product || !sourceIds.has(product.sourceId)) {
      untraceable.push(l.slug);
      continue;
    }

    // ---- slug ----
    const fixed = correctedSlug(product);
    if (fixed && fixed !== l.slug) {
      slugChanges.push({ id: product.sourceId, _id: l._id, from: l.slug, to: fixed, title: l.title });
    }

    // ---- description ----
    const manualHeading = MANUAL_HEADINGS.get(product.sourceId) ?? null;
    const { text, removed, stoppedBy, manual } = stripLeadingTitle(l.description, l.title, manualHeading);
    if (stoppedBy && !removed.length) {
      descSkipped.push({ id: product.sourceId, slug: l.slug, title: l.title, desc: l.description, stoppedBy });
      continue;
    }
    if (!removed.length) {
      descUnchanged.push({ id: product.sourceId, slug: l.slug, title: l.title, start: l.description.slice(0, 70) });
      continue;
    }
    if (text.length < MIN_DESCRIPTION) {
      problematic.push({ id: product.sourceId, slug: l.slug, reason: `result too short (${text.length})` });
      continue;
    }
    if (text.length > MAX_DESCRIPTION) {
      problematic.push({ id: product.sourceId, slug: l.slug, reason: `result too long (${text.length})` });
      continue;
    }

    descChanges.push({
      id: product.sourceId,
      slug: l.slug,
      title: l.title,
      _id: l._id,
      before: l.description,
      after: text,
      removed,
      stoppedBy,
      manual,
      beforeLen: l.description.length,
      afterLen: text.length,
    });
  }

  // ---- preview ----
  console.log('\n================= CLEANUP PREVIEW =================');
  console.log(`Imported listings in scope      : ${inScope.length - untraceable.length}`);
  console.log(`\n1) SLUG FIX — ${slugChanges.length} listing(s)`);
  for (const c of slugChanges) {
    console.log(`   #${c.id} "${c.title}"`);
    console.log(`      ${c.from}  ->  ${c.to}`);
  }
  console.log(`\n2) DESCRIPTION CLEANUP — ${descChanges.length} listing(s) change`);
  console.log(`   left completely untouched, name is the sentence subject : ${descSkipped.length}`);
  for (const s of descSkipped) {
    console.log(`      #${s.id} ${s.slug} (${s.stoppedBy})`);
    console.log(`         title : ${s.title.slice(0, 70)}`);
    console.log(`         desc  : "${s.desc.slice(0, 70)}…"`);
  }
  console.log(`   no title repeat found at all (YOUR CALL) : ${descUnchanged.length}`);
  for (const u of descUnchanged) {
    console.log(`      #${u.id} ${u.slug}`);
    console.log(`         title : ${u.title.slice(0, 70)}`);
    console.log(`         desc  : "${u.start}…"`);
  }

  const trimmedIds = ['51', '37', '13'];
  console.log('\n   previously-trimmed descriptions (5000-char limit check):');
  for (const id of trimmedIds) {
    const c = descChanges.find((x) => x.id === id);
    if (c) {
      console.log(`      #${id}: ${c.beforeLen} -> ${c.afterLen} chars  ${c.afterLen <= MAX_DESCRIPTION ? 'OK' : 'OVER LIMIT'}`);
    }
  }

  const multi = descChanges.filter((c) => c.removed.length > 1);
  if (multi.length) {
    console.log(`\n   headings repeated more than once (all repeats removed): ${multi.map((c) => `#${c.id}`).join(', ')}`);
  }
  const partial = descChanges.filter((c) => c.stoppedBy);
  if (partial.length) {
    console.log(
      `   stopped early, a later occurrence is the sentence subject: ${partial
        .map((c) => `#${c.id} (${c.stoppedBy})`)
        .join(', ')}`
    );
  }
  const manualCuts = descChanges.filter((c) => c.manual);
  if (manualCuts.length) {
    console.log(`\n   hand-specified headings cut (${manualCuts.length}):`);
    for (const c of manualCuts) console.log(`      #${c.id} "${c.removed[0]}"`);
  }
  if (problematic.length) {
    console.log(`\n   REJECTED (not applied): ${JSON.stringify(problematic)}`);
  }
  if (untraceable.length) {
    console.log(`\n   not traceable to a scraped product: ${untraceable.join(', ')}`);
  }

  console.log('\n   samples:');
  for (const c of SHOW_ALL ? descChanges : descChanges.slice(0, 3)) {
    console.log(`   --- #${c.id} ${c.slug} (${c.beforeLen} -> ${c.afterLen})`);
    console.log(`       removed : ${c.removed.map((r) => `"${r.slice(0, 45)}"`).join(' + ')}`);
    console.log(`       after   : "${(SHOW_ALL ? c.after.slice(0, 110) : c.after.slice(0, 90))}…"`);
  }

  // Full before/after for the ids the caller asked to inspect, so a hand-cut
  // heading can be read in context before it is committed.
  for (const id of SHOW_IDS) {
    const c = descChanges.find((x) => x.id === id);
    if (!c) {
      const u = descUnchanged.find((x) => x.id === id);
      console.log(`\n   ### #${id} — no change planned${u ? ` (${u.slug})` : ''}`);
      if (u) {
        console.log(`       title  : ${u.title}`);
        console.log(`       desc   : ${JSON.stringify(u.start)}`);
      }
      continue;
    }
    console.log(`\n   ### #${id} ${c.slug}  (${c.beforeLen} -> ${c.afterLen} chars)${c.manual ? '  [HAND-SPECIFIED HEADING]' : ''}`);
    console.log(`       title   : ${c.title}`);
    console.log(`       removing: ${c.removed.map((r) => `"${r}"`).join(' + ')}`);
    console.log(`       BEFORE  : ${JSON.stringify(c.before.slice(0, 200))}`);
    console.log(`       AFTER   : ${JSON.stringify(c.after.slice(0, 200))}`);
    console.log(`       tail kept unchanged: ${c.before.slice(-40) === c.after.slice(-40) ? 'yes' : 'NO'}`);
  }
  console.log('===================================================');

  if (!COMMIT) {
    console.log('\nDRY RUN — nothing written. Re-run with --commit to apply.');
    await mongoose.disconnect();
    return;
  }

  // ---- apply ----
  console.log('\n[fix] applying…');
  let slugsWritten = 0;
  let descsWritten = 0;
  const failures = [];

  for (const c of slugChanges) {
    try {
      const clash = await Listing.findOne({ slug: c.to, _id: { $ne: c._id } }).select('_id').lean();
      if (clash) throw new Error(`slug "${c.to}" is already taken by another listing`);
      const res = await Listing.updateOne({ _id: c._id }, { $set: { slug: c.to } });
      // A filter that matches nothing resolves happily, so the count is what
      // says the write actually happened.
      if (res.matchedCount !== 1) throw new Error(`matched ${res.matchedCount} document(s), expected 1`);
      slugsWritten += 1;
    } catch (error) {
      failures.push({ kind: 'slug', id: c.id, reason: error.message });
    }
  }

  for (const c of descChanges) {
    try {
      const res = await Listing.updateOne({ _id: c._id }, { $set: { description: c.after } });
      if (res.matchedCount !== 1) throw new Error(`matched ${res.matchedCount} document(s), expected 1`);
      descsWritten += 1;
    } catch (error) {
      failures.push({ kind: 'description', id: c.id, reason: error.message });
    }
  }

  console.log('\n================= APPLIED =================');
  console.log(`Slugs updated        : ${slugsWritten}/${slugChanges.length}`);
  console.log(`Descriptions updated : ${descsWritten}/${descChanges.length}`);
  if (failures.length) {
    console.log(`Failures             : ${failures.length}`);
    for (const f of failures) console.log(`  [${f.kind}] #${f.id} -> ${f.reason}`);
    process.exitCode = 1;
  }
  console.log('===========================================');

  if (failures.length) {
    console.log('\nSome writes failed — re-run to retry (the script is idempotent).');
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('[fix] fatal:', error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
