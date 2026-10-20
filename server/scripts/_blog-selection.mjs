/**
 * TEMPORARY shared helper (delete with the other _*.mjs scripts).
 *
 * Holds the approved 20-blog selection and the title-matching logic used by
 * both the verifier and the cleanup.
 *
 * WHY THE MATCHING IS NOT JUST AN EXACT STRING COMPARE
 * ----------------------------------------------------
 * Devanagari writes a nukta consonant two ways, and this source uses both:
 *
 *   precomposed  भ + े + U+095C            (the scrape: "भेड़ पालन व्यापार")
 *   decomposed   भ + े + U+0921 + U+093C   (typed form: "भेड़ पालन")
 *
 * These are the same word but different code points, so `===` says no. NFC and
 * NFKC are not dependable here — whether they fold the pair depends on the
 * runtime's Unicode tables. So the comparison key drops every combining mark
 * and additionally folds the precomposed nukta letters to their base
 * consonant, which makes both spellings collapse to the same key with no
 * reliance on normalisation data at all.
 *
 * The aggressive key is only ever a FALLBACK: exact and normalised matches are
 * tried first, and a fallback that matches more than one document is treated
 * as an error rather than a guess.
 */

/** The approved 20, in the approved order. */
export const RETAIN = [
  // --- Goat / Bakra (13) ---
  'Best Goat Breeds for Meat: A Farmer\'s Guide',
  'Best Common Goat Breeds: How to Choose the Right Goat',
  'Top Goats Breeds For Milk',
  'Registered Goats Breed Of India',
  'Can You Keep Different Goat Breeds Together? A Clear Guide',
  'Is Goat Farming Profitable? Products, Land and Markets',
  'बकरी पालन व्यवसाय',
  'Why Do Goats Headbutt? Dominance, Horns and Neck Strain',
  'बकरियों में होने वाले प्रमुख रोग',
  'बकरियों का टीकाकरण',
  'बकरी के दूध का उपयोग',
  'बकरियों के लिए टॉप 5 सप्लीमेंट',
  'टिकाऊ कृषि और भूमि प्रबंधन में बकरियों की भूमिका',
  // --- Other Animalss (7) ---
  'How Long Is a Cow Pregnant? A Complete Cattle Gestation Guide',
  'Cow vs Buffalo: Milk, Meat, Dung and Draught Power Compared',
  'भैंस क्या होती है?',
  'भेड़ पालन व्यापार',
  'मुर्गी पालन',
  'मछली पालन व्यापार',
  'How Fast Can a Horse Run? What Every Farmer Needs to Know',
];

/**
 * Precomposed Devanagari nukta letters -> base consonant. Applied AFTER NFD
 * so that a form the runtime did decompose is already handled by the
 * combining-mark filter, and a form it did not decompose is handled here.
 */
const NUKTA_LETTERS = new Map(Object.entries({
  'क़': 'क', // क़ -> क
  'ख़': 'ख', // ख़ -> ख
  'ग़': 'ग', // ग़ -> ग
  'ज़': 'ज', // ज़ -> ज
  'ड़': 'ड', // ड़ -> ड
  'ढ़': 'ढ', // ढ़ -> ढ
  'फ़': 'फ', // फ़ -> फ
  'य़': 'य', // य़ -> य
}));

/** Comparison key with no dependence on Unicode normalisation tables. */
export function skeleton(value) {
  let out = '';
  for (const ch of String(value ?? '').normalize('NFD')) {
    if (/\p{M}/u.test(ch)) continue; // combining marks, including nukta
    out += NUKTA_LETTERS.get(ch) ?? ch;
  }
  return out.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Code points, for reporting exactly which encoding a string uses. */
export function codePoints(value) {
  return [...String(value ?? '')]
    .map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
    .join(' ');
}

const STRATEGIES = [
  ['exact', (t) => t],
  ['nfc', (t) => t.normalize('NFC')],
  ['nfkc', (t) => t.normalize('NFKC')],
  ['skeleton', (t) => skeleton(t)],
];

/**
 * Resolves the approved 20 against every blog in the collection.
 * Returns which strategy matched each one, plus anything missing or ambiguous.
 */
export function resolveRetained(docs) {
  const index = new Map(STRATEGIES.map(([name]) => [name, new Map()]));
  for (const doc of docs) {
    const title = doc.title ?? '';
    for (const [name, key] of STRATEGIES) {
      const map = index.get(name);
      const k = key(title);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(doc);
    }
  }

  const retained = [];
  const missing = [];
  const ambiguous = [];
  const matchedVia = [];

  for (const title of RETAIN) {
    let hit = null;
    let via = null;
    let ambiguousHit = null;

    for (const [name, key] of STRATEGIES) {
      const hits = index.get(name).get(key(title)) ?? [];
      if (hits.length > 1) { ambiguousHit = { title, via: name, n: hits.length }; break; }
      if (hits.length === 1) { hit = hits[0]; via = name; break; }
    }

    if (ambiguousHit) { ambiguous.push(ambiguousHit); continue; }
    if (!hit) { missing.push(title); continue; }
    retained.push(hit);
    matchedVia.push({ title, via, stored: hit.title, slug: hit.slug });
  }

  return { retained, missing, ambiguous, matchedVia };
}
