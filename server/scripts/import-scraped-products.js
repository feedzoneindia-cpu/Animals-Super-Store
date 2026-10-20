#!/usr/bin/env node
/**
 * Phase 2 — imports `scraped-data/products.json` (produced by
 * scrape-products.js) into this project's MongoDB as Listing documents.
 *
 * Safe by default: it runs as a dry run and only prints what it *would* do.
 * Pass --commit to actually upload images and write to the database.
 *
 *   node src/scripts/import-scraped-products.js              # preview only
 *   node src/scripts/import-scraped-products.js --commit     # upload + insert
 *   node src/scripts/import-scraped-products.js --commit --limit=3
 *   node src/scripts/import-scraped-products.js --commit --ids=57,53
 *   node src/scripts/import-scraped-products.js --commit --reupload   # fresh images
 *
 * Idempotent: each scraped product maps to a deterministic slug, so re-running
 * updates the listing it created last time instead of inserting a duplicate.
 * Existing images are reused on re-run unless --reupload is passed.
 */
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { MAX_LISTING_IMAGES } from '../constants/listings.js';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { isCloudinaryConfigured, uploadImage } from '../services/cloudinary.service.js';
import { slugify } from '../utils/slug.js';
import { createListingSchema } from '../validators/listing.validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'scraped-data');
const PRODUCTS_JSON = path.join(DATA_DIR, 'products.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

const MAX_DESCRIPTION = 5000;
const MAX_STOCK = 100_000;
const DEFAULT_STOCK = 10;
/** Uploads run a few at a time — fast enough without hammering the API. */
const UPLOAD_CONCURRENCY = 4;

// ---------------------------------------------------------------------------
// Category mapping — mirrors the agreed rules, keyed by source product id so
// every decision is auditable rather than buried in a keyword heuristic.
// ---------------------------------------------------------------------------
const SHAMPOO_IDS = ['52', '54']; // AMS Shampoo (EN + HI) — grooming, not feed.
const AMBIGUOUS_IDS = ['51', '12']; // "घोड़ा जीरा क्या हैं?" and "एनिमल्स कॉम्बो लिक्विड".
const DEFAULT_CATEGORY = 'Animals Food';

function mapCategory(sourceId) {
  if (SHAMPOO_IDS.includes(sourceId)) return 'Animals Accessories';
  if (AMBIGUOUS_IDS.includes(sourceId)) return 'Other';
  return DEFAULT_CATEGORY;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(`--${name}`);
const argValue = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const COMMIT = hasFlag('commit');
const REUPLOAD = hasFlag('reupload');
const LIMIT = argValue('limit', null) === null ? null : Number(argValue('limit'));
const ONLY_IDS = argValue('ids', null) === null ? null : argValue('ids').split(',').map((s) => s.trim());

// ---------------------------------------------------------------------------
// Field mapping helpers
// ---------------------------------------------------------------------------
/**
 * Truncates to the destination's 5000-char limit on a sentence boundary where
 * one is available late enough to be worth using, else on a word boundary.
 */
function trimDescription(text, limit = MAX_DESCRIPTION) {
  if (!text || text.length <= limit) return { text: text ?? '', trimmed: false };
  const slice = text.slice(0, limit);
  const sentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? ')
  );
  if (sentenceEnd >= limit * 0.5) {
    return { text: slice.slice(0, sentenceEnd + 1).trim(), trimmed: true };
  }
  const wordEnd = slice.lastIndexOf(' ');
  return { text: slice.slice(0, wordEnd > 0 ? wordEnd : limit).trim(), trimmed: true };
}

const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

/** Buyer-facing spec block — the source's specs, minus anything internal. */
function buildAdditionalDetails(product, discount) {
  const lines = [];
  if (product.packRaw) lines.push(`Pack size: ${product.packRaw}`);
  if (product.sourceForm) lines.push(`Form: ${product.sourceForm}`);
  if (product.mrp !== null && product.price !== null && product.mrp > product.price) {
    const off = discount === null ? '' : ` (${discount}% off)`;
    lines.push(`MRP: ${rupees(product.mrp)}${off}`);
  }
  if (product.location) lines.push(`Ships from: ${product.location}`);
  const text = lines.join('\n');
  return text.length <= 2000 ? text : text.slice(0, 2000);
}

/**
 * The destination's slugify() is ASCII-only, so Hindi names collapse to "".
 * Those fall back to a stable id-based slug; duplicates within the batch get
 * the source id appended so the result never depends on iteration order.
 */
function baseSlugFor(product) {
  return slugify(product.name) || slugify(product.pageTitle) || `product-${product.sourceId}`;
}

// ---------------------------------------------------------------------------
// Mapping: scraped JSON -> Listing fields (pure, no IO)
// ---------------------------------------------------------------------------
function mapProduct(product, seller, slug, images) {
  const { text: description, trimmed } = trimDescription(product.descriptionText);
  const stock = Number.isFinite(product.unitsInStock)
    ? Math.min(Math.max(Math.trunc(product.unitsInStock), 0), MAX_STOCK)
    : DEFAULT_STOCK;

  return {
    doc: {
      title: product.name,
      slug,
      category: mapCategory(product.sourceId),
      description,
      price: Math.trunc(product.price),
      stockQuantity: stock,
      location: product.location || 'India',
      images,
      seller: seller._id,
      sellerName: seller.name,
      contactNumber: seller.phone || '0000000000',
      contactEmail: seller.email,
      additionalDetails: buildAdditionalDetails(product, product.discountPercent),
      status: 'active',
    },
    meta: { trimmed, slugFallback: !slugify(product.name), stock, imageCount: images.length },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const raw = JSON.parse(await fs.readFile(PRODUCTS_JSON, 'utf8'));
  let products = raw.products;
  if (ONLY_IDS) products = products.filter((p) => ONLY_IDS.includes(p.sourceId));
  if (LIMIT !== null) products = products.slice(0, LIMIT);

  console.log(`[import] source      : ${PRODUCTS_JSON}`);
  console.log(`[import] mode        : ${COMMIT ? 'COMMIT (writes to DB)' : 'DRY RUN (no writes)'}`);
  console.log(`[import] products    : ${products.length}\n`);

  await mongoose.connect(env.mongoUri);

  // ---- seller: earliest ADMIN, else earliest user of any role ----
  const seller =
    (await User.findOne({ role: 'ADMIN' }).sort({ createdAt: 1 })) ??
    (await User.findOne({}).sort({ createdAt: 1 }));
  if (!seller) {
    throw new Error('No user exists in the database to use as the listing seller. Run `npm run seed` first.');
  }
  console.log(`[import] seller      : ${seller.name} <${seller.email}> phone=${seller.phone || '(none)'} role=${seller.role}`);
  if (!seller.phone) console.warn('[import] WARNING: seller has no phone; contactNumber will fall back to a placeholder.');

  const folder = `Animals-super-store/listings/${seller._id.toString()}`;
  console.log(`[import] cloudinary  : ${isCloudinaryConfigured() ? `configured, folder ${folder}` : 'NOT CONFIGURED — --commit will fail'}`);

  // ---- deterministic slugs (batch-aware) ----
  const baseCounts = new Map();
  for (const p of products) {
    const b = baseSlugFor(p);
    baseCounts.set(b, (baseCounts.get(b) ?? 0) + 1);
  }
  const slugFor = (p) => {
    const base = baseSlugFor(p);
    return baseCounts.get(base) > 1 ? `${base}-${p.sourceId}` : base;
  };

  // ---- plan ----
  const existing = await Listing.find({ slug: { $in: products.map(slugFor) } }).select('slug seller images').lean();
  const existingBySlug = new Map(existing.map((d) => [d.slug, d]));
  const foreignSlug = new Set(
    existing.filter((d) => String(d.seller) !== String(seller._id)).map((d) => d.slug)
  );

  const plan = [];
  for (const p of products) {
    const slug = slugFor(p);
    const prior = existingBySlug.get(slug);
    const incoming = p.images.filter((img) => img.localPath);
    const reuseImages = prior && !REUPLOAD && (prior.images?.length ?? 0) > 0;
    plan.push({
      product: p,
      slug,
      action: prior ? 'update' : 'insert',
      slugCollision: foreignSlug.has(slug),
      reuseImages,
      imagesToUpload: incoming.length,
      images: incoming,
    });
  }

  // ---- counts ----
  const byCategory = {};
  for (const item of plan) {
    const c = mapCategory(item.product.sourceId);
    byCategory[c] = (byCategory[c] ?? 0) + 1;
  }
  const uploadTotal = plan.filter((i) => !i.reuseImages).reduce((n, i) => n + i.imagesToUpload, 0);
  const reusedTotal = plan.filter((i) => i.reuseImages).reduce((n, i) => n + i.imagesToUpload, 0);

  // ---- validation (against the real create-listing schema) ----
  const validationErrors = [];
  const trimNotes = [];
  const noImage = [];
  const noStock = [];
  const nonIntegerPrice = [];
  const hindiSlug = [];
  const slugCollisions = [];

  for (const item of plan) {
    const p = item.product;
    if (item.images.length === 0) noImage.push(p.sourceId);
    if (!Number.isFinite(p.unitsInStock)) noStock.push(p.sourceId);
    if (!Number.isInteger(p.price)) nonIntegerPrice.push({ id: p.sourceId, price: p.price });
    if (item.slugCollision) slugCollisions.push({ id: p.sourceId, slug: item.slug });

    // Dry runs have no Cloudinary URLs yet; validate with the source URL as a
    // stand-in so schema problems still surface before anything is uploaded.
    const placeholder = item.images.slice(0, MAX_LISTING_IMAGES).map((img) => ({
      url: img.url,
      publicId: '',
    }));
    const { doc, meta } = mapProduct(p, seller, item.slug, placeholder);
    if (meta.trimmed) trimNotes.push({ id: p.sourceId, from: p.descriptionText.length });
    if (meta.slugFallback) hindiSlug.push(p.sourceId);

    const result = createListingSchema.safeParse(doc);
    if (!result.success) {
      validationErrors.push({
        id: p.sourceId,
        title: p.name.slice(0, 40),
        issues: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
    }
  }

  // ---- preview ----
  console.log('\n================ IMPORT PREVIEW ================');
  console.log(`Total products        : ${plan.length}`);
  console.log(`  insert / update     : ${plan.filter((i) => i.action === 'insert').length} / ${plan.filter((i) => i.action === 'update').length}`);
  console.log('\nCategory breakdown:');
  for (const [c, n] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c.padEnd(20)}: ${n}`);
  }
  console.log(`\nImages to upload to Cloudinary : ${uploadTotal}`);
  if (reusedTotal) console.log(`Images reused from existing    : ${reusedTotal} (re-run; pass --reupload to replace)`);

  console.log('\nData condition:');
  console.log(`  descriptions trimmed to 5000 : ${trimNotes.length}${trimNotes.length ? ` -> ${trimNotes.map((t) => `#${t.id} (${t.from})`).join(', ')}` : ''}`);
  console.log(`  products with 0 valid images : ${noImage.length}${noImage.length ? ` -> ${noImage.map((id) => `#${id}`).join(', ')}` : ''}`);
  console.log(`  products missing stock qty   : ${noStock.length}${noStock.length ? ` -> ${noStock.map((id) => `#${id} (default ${DEFAULT_STOCK})`).join(', ')}` : ''}`);
  console.log(`  non-integer prices           : ${nonIntegerPrice.length}${nonIntegerPrice.length ? ` -> ${JSON.stringify(nonIntegerPrice)}` : ''}`);
  console.log(`  Hindi names -> id-based slug : ${hindiSlug.length} (slugify() is ASCII-only)`);
  if (hindiSlug.length) console.log(`     e.g. ${plan.filter((i) => hindiSlug.includes(i.product.sourceId)).slice(0, 3).map((i) => `#${i.product.sourceId} -> ${i.slug}`).join(', ')}`);
  if (slugCollisions.length) console.log(`  SLUG COLLISIONS with other sellers: ${JSON.stringify(slugCollisions)}`);

  if (validationErrors.length) {
    console.log(`\nSchema validation failures: ${validationErrors.length}`);
    for (const e of validationErrors) console.log(`  #${e.id} "${e.title}" -> ${e.issues.join('; ')}`);
  } else {
    console.log('\nSchema validation          : all products pass createListingSchema');
  }

  console.log('\nSample of what will be written:');
  for (const item of plan.slice(0, 3)) {
    const { doc } = mapProduct(item.product, seller, item.slug, []);
    console.log(`  #${item.product.sourceId} "${doc.title.slice(0, 45)}"`);
    console.log(`     slug=${doc.slug} category=${doc.category} price=${doc.price} stock=${doc.stockQuantity} images=${item.images.length}`);
    console.log(`     desc(${doc.description.length}) "${doc.description.slice(0, 70)}…"`);
    console.log(`     additionalDetails=${JSON.stringify(doc.additionalDetails)}`);
  }
  console.log('===============================================');

  if (!COMMIT) {
    console.log('\nDRY RUN — nothing was uploaded or written. Re-run with --commit to import.');
    await mongoose.disconnect();
    return;
  }

  if (validationErrors.length) {
    throw new Error(`Refusing to commit: ${validationErrors.length} product(s) failed schema validation.`);
  }

  // ---- preflight: every image we plan to upload must exist on disk. Failing
  // here beats discovering it 153 times mid-upload. ----
  const missingFiles = [];
  for (const item of plan) {
    if (item.reuseImages) continue;
    for (const img of item.images.slice(0, MAX_LISTING_IMAGES)) {
      const abs = path.join(IMAGES_DIR, path.basename(img.localPath));
      try {
        await fs.access(abs);
      } catch {
        missingFiles.push(abs);
      }
    }
  }
  if (missingFiles.length) {
    throw new Error(
      `${missingFiles.length} image file(s) referenced by products.json are missing from ${IMAGES_DIR}. ` +
        `Re-run the scraper (\`npm run scrape -w server\`) to regenerate them.\n  e.g. ${missingFiles
          .slice(0, 3)
          .join('\n       ')}`
    );
  }

  // ---- upload images ----
  console.log(`\n[import] uploading ${uploadTotal} image(s) to Cloudinary…`);
  let uploaded = 0;
  const uploadErrors = [];

  async function uploadOne(item) {
    const p = item.product;
    const refs = [];
    for (const img of item.images.slice(0, MAX_LISTING_IMAGES)) {
      const abs = path.join(IMAGES_DIR, path.basename(img.localPath));
      try {
        const buffer = await fs.readFile(abs);
        const { url, publicId } = await uploadImage(buffer, folder);
        refs.push({ url, publicId });
        uploaded += 1;
        if (uploaded % 20 === 0) console.log(`[import]   ${uploaded}/${uploadTotal} uploaded…`);
      } catch (error) {
        uploadErrors.push({ id: p.sourceId, file: img.localPath, message: error.message });
      }
    }
    return refs;
  }

  // Limited-concurrency worker pool.
  const queue = plan.filter((i) => !i.reuseImages);
  const workers = Array.from({ length: UPLOAD_CONCURRENCY }, async () => {
    while (queue.length) {
      const item = queue.shift();
      item.uploadedImages = await uploadOne(item);
    }
  });
  await Promise.all(workers);

  // ---- write ----
  console.log('\n[import] writing listings…');
  const results = { inserted: 0, updated: 0, skipped: 0, failed: [] };

  for (const item of plan) {
    const p = item.product;
    try {
      let images;
      if (item.reuseImages) {
        const prior = existingBySlug.get(item.slug);
        images = prior.images;
      } else {
        images = item.uploadedImages ?? [];
      }
      if (images.length === 0) {
        results.skipped += 1;
        results.failed.push({ id: p.sourceId, reason: 'no images available after upload' });
        continue;
      }

      const { doc } = mapProduct(p, seller, item.slug, images.slice(0, MAX_LISTING_IMAGES));
      const prior = existingBySlug.get(item.slug);

      if (prior) {
        const listing = await Listing.findById(prior._id);
        Object.assign(listing, doc);
        await listing.save();
        results.updated += 1;
      } else {
        await new Listing(doc).save();
        results.inserted += 1;
      }
    } catch (error) {
      results.failed.push({ id: p.sourceId, reason: error.message });
    }
  }

  // ---- summary ----
  const finalCount = await Listing.countDocuments({ seller: seller._id });
  const byCat = await Listing.aggregate([
    { $match: { seller: seller._id } },
    { $group: { _id: '$category', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);

  console.log('\n================ IMPORT SUMMARY ================');
  console.log(`Inserted              : ${results.inserted}`);
  console.log(`Updated               : ${results.updated}`);
  console.log(`Skipped               : ${results.skipped}`);
  console.log(`Images uploaded       : ${uploaded}`);
  if (uploadErrors.length) console.log(`Image upload failures : ${uploadErrors.length}`);
  if (results.failed.length) {
    console.log(`Failed products       : ${results.failed.length}`);
    for (const f of results.failed) console.log(`  #${f.id} -> ${f.reason}`);
  }
  if (uploadErrors.length) {
    for (const e of uploadErrors) console.log(`  [upload] #${e.id} ${e.file} -> ${e.message}`);
  }
  console.log(`\nListings now owned by ${seller.name}: ${finalCount}`);
  for (const row of byCat) console.log(`  ${String(row._id).padEnd(20)}: ${row.n}`);
  console.log('===============================================');

  // A run where nothing was written must not report success to the shell —
  // otherwise a caller (or CI) sees exit 0 on a total failure.
  if (results.inserted + results.updated === 0 && results.failed.length > 0) {
    process.exitCode = 1;
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('[import] fatal:', error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
