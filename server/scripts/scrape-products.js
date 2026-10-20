#!/usr/bin/env node
/**
 * Scrapes the live Animalssss (Animalssss.com) wholesale catalog into
 * `scraped-data/products.json` plus downloaded images in `scraped-data/images/`.
 *
 * Phase 1 of the catalog migration: this script only reads the public source
 * site and writes local files. It never touches the Animals Super Store DB.
 *
 * Politeness: requests run strictly one at a time with a delay between each
 * (default 700ms) and an identifying User-Agent. The source site's robots.txt
 * allows /Wholesale-Product and /ourproduct; its /api/ is disallowed and is
 * deliberately not used here. Discovery comes from sitemap-wholesale.xml,
 * cross-checked against /ourproduct/All.
 *
 * Usage:
 *   node src/scripts/scrape-products.js                 # full run
 *   node src/scripts/scrape-products.js --limit=3       # first N products
 *   node src/scripts/scrape-products.js --ids=57,53     # specific product ids
 *   node src/scripts/scrape-products.js --no-images     # skip image downloads
 *   node src/scripts/scrape-products.js --delay=1200    # slower / gentler
 */
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'scraped-data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const PRODUCTS_JSON = path.join(DATA_DIR, 'products.json');

const BASE = 'https://Animalssss.com';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/120.0 Safari/537.36 AnimalsSuperStoreCatalogMigration/1.0 (+own-catalog-migration)';

/** The source site's own product "kinds" — these are its category pages. */
const SOURCE_KINDS = ['Feed', 'Lick', 'Liquid', 'Other', 'Powder'];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(`--${name}`);
const argValue = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const DELAY_MS = Number(argValue('delay', '700'));
const LIMIT = argValue('limit', null) === null ? null : Number(argValue('limit'));
const ONLY_IDS = argValue('ids', null) === null ? null : argValue('ids').split(',').map((s) => s.trim());
const DOWNLOAD_IMAGES = !hasFlag('no-images');

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
const http = axios.create({
  timeout: 30_000,
  maxRedirects: 5,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en,hi;q=0.9',
  },
  validateStatus: (s) => s >= 200 && s < 400,
});

/**
 * Fetches a URL and decodes it as UTF-8 explicitly. The source site serves
 * some XML/HTML without a charset, so letting the HTTP client guess mangles
 * the Devanagari product names.
 */
async function fetchText(url) {
  const res = await http.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(res.data).toString('utf8');
}

async function fetchBinary(url) {
  const res = await http.get(url, { responseType: 'arraybuffer' });
  return { buffer: Buffer.from(res.data), contentType: res.headers['content-type'] ?? '' };
}

/**
 * Percent-encodes each path segment. The source sitemap contains raw (already
 * decoded) Devanagari in its <loc> values, so we normalise idempotently to
 * work for both raw and pre-encoded URLs.
 */
function normalizeSourceUrl(raw) {
  try {
    const url = new URL(raw, BASE);
    url.pathname = url.pathname
      .split('/')
      .map((seg) => {
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join('/');
    return url.toString();
  } catch {
    return raw;
  }
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------
const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

/** "₹1,234.50" -> 1234.5 ; "" -> null */
function parseMoney(text) {
  const m = /([\d,]+(?:\.\d+)?)/.exec(String(text ?? ''));
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** "36%" -> 36 ; "" -> null */
function parsePercent(text) {
  const m = /([\d.]+)/.exec(String(text ?? ''));
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** "1 KG" -> { quantity: 1, unit: "KG" } ; "0.50 Gram" -> { quantity: 0.5, unit: "Gram" } */
function parsePack(text) {
  const s = norm(text);
  if (!s) return { quantity: null, unit: '', raw: '' };
  const m = /^([\d.]+)\s*(.+)$/.exec(s);
  if (!m) return { quantity: null, unit: s, raw: s };
  const q = Number(m[1]);
  return { quantity: Number.isFinite(q) ? q : null, unit: norm(m[2]), raw: s };
}

/** Devanagari presence tells us which language the single name field is in. */
const hasDevanagari = (s) => /[ऀ-ॿ]/.test(s ?? '');

function slugToFilenamePart(slug) {
  return (slug ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const EXT_BY_MIME = {
  'image/jpeg': '.jpeg',
  'image/jpg': '.jpeg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function extensionFor(url, contentType) {
  const mime = String(contentType).split(';')[0].trim().toLowerCase();
  if (EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
  const fromUrl = /\.(jpe?g|png|webp|gif)(?:$|\?)/i.exec(new URL(url, BASE).pathname);
  if (fromUrl) return `.${fromUrl[1].toLowerCase().replace('jpg', 'jpeg')}`;
  return '.jpeg';
}

/** Pulls the Product / BreadcrumbList nodes out of the page's JSON-LD. */
function parseJsonLd($) {
  const out = { product: null, breadcrumb: null };
  $('script[type="application/ld+json"]').each((_, el) => {
    let data;
    try {
      data = JSON.parse($(el).contents().text());
    } catch {
      return;
    }
    const nodes = data?.['@graph'] ? data['@graph'] : [data];
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const type = node['@type'];
      if (type === 'Product' && !out.product) out.product = node;
      if (type === 'BreadcrumbList' && !out.breadcrumb) out.breadcrumb = node;
    }
  });
  return out;
}

/** The spec table is a clean key/value grid, but rows vary per product. */
function parseSpecs($) {
  const specs = {};
  $('.mp-specs-grid .mp-spec-item').each((_, el) => {
    const key = norm($(el).find('.key').text());
    const val = norm($(el).find('.val').text());
    if (key) specs[key] = val;
  });
  return specs;
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------
async function discoverFromSitemap() {
  const xml = await fetchText(`${BASE}/sitemap-wholesale.xml`);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const products = [];
  for (const loc of locs) {
    const m = /\/Wholesale-Product\/(\d+)\/(.*)$/.exec(new URL(loc, BASE).pathname);
    if (!m) continue;
    let slug = m[2];
    try {
      slug = decodeURIComponent(slug);
    } catch {
      /* keep raw */
    }
    products.push({ id: m[1], slug, url: normalizeSourceUrl(loc) });
  }
  return products;
}

/** id -> source kind, taken from the site's own /ourproduct/<Kind> pages. */
async function discoverKindMap() {
  const kindById = new Map();
  for (const kind of SOURCE_KINDS) {
    await sleep(DELAY_MS);
    const html = await fetchText(`${BASE}/ourproduct/${kind}`);
    const ids = [...html.matchAll(/\/Wholesale-Product\/(\d+)\//g)].map((m) => m[1]);
    for (const id of new Set(ids)) if (!kindById.has(id)) kindById.set(id, kind);
  }
  return kindById;
}

// ---------------------------------------------------------------------------
// Product page
// ---------------------------------------------------------------------------
function parseProductPage(html, { id, slug, url }, sourceKind) {
  const $ = cheerio.load(html);
  const jsonLd = parseJsonLd($);
  const specs = parseSpecs($);

  const ldProduct = jsonLd.product ?? {};
  const ldOffer = ldProduct.offers ?? {};

  const name = norm($('h1').first().text()) || norm(ldProduct.name);
  const title = norm($('title').text()).replace(/\s*[—|-]\s*Wholesale\s*[—|-]\s*Animalssss\s*$/i, '');

  // Category: prefer the site's own product-type link, fall back to the
  // /ourproduct/<Kind> page membership we discovered separately.
  const breadcrumbKind = (() => {
    const items = jsonLd.breadcrumb?.itemListElement ?? [];
    const link = items.find((it) => /\/ourproduct\//.test(it?.item ?? ''));
    if (!link) return '';
    return norm(link.name) || String(link.item).split('/').filter(Boolean).pop() || '';
  })();
  const specProductType = specs['Product type'] ?? '';

  const price = parseMoney(specs['Selling price'] ?? ldOffer.price);
  const mrp = parseMoney(specs['MRP']);
  const discountPercent =
    parsePercent(specs['Discount']) ??
    (mrp && price && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : null);

  const stockText = norm($('.mp-detail-badges .mp-badge.legal').text());
  const ldAvailability = String(ldOffer.availability ?? '');
  const inStock = ldAvailability
    ? /InStock$/i.test(ldAvailability) && !/OutOfStock$/i.test(ldAvailability)
    : /in stock/i.test(stockText) && !/out of stock/i.test(stockText);

  // Images: the gallery holds the main photo; the description body often
  // carries extra inline photos. Both are product imagery.
  const images = [];
  const seen = new Set();
  const push = (src, kind) => {
    const raw = norm(src);
    if (!raw) return;
    let abs;
    try {
      abs = new URL(raw, BASE).toString();
    } catch {
      return;
    }
    if (seen.has(abs)) return;
    seen.add(abs);
    images.push({ url: abs, kind });
  };
  $('.mp-gallery img').each((_, el) => push($(el).attr('src') ?? $(el).attr('data-src'), 'gallery'));
  $('.ws-desc img').each((_, el) => push($(el).attr('src') ?? $(el).attr('data-src'), 'description'));

  const descHtml = norm($('.ws-desc').html() ?? '');
  const descText = norm($('.ws-desc').text()) || norm(ldProduct.description);

  return {
    sourceId: id,
    sourceUrl: url,
    sourceSlug: slug,

    name,
    nameLanguage: hasDevanagari(name) ? 'hi' : 'en',
    pageTitle: title,
    descriptionHtml: descHtml,
    descriptionText: descText,

    // What the source site itself calls this product's category/form.
    sourceCategory: sourceKind ?? breadcrumbKind ?? specProductType ?? '',
    sourceProductType: specProductType,
    sourceBreadcrumbCategory: breadcrumbKind,
    sourceForm: specs['Form'] ?? '',
    sourceCategoryFromSitemap: sourceKind ?? '',

    price,
    mrp,
    discountPercent,
    currency: ldOffer.priceCurrency ?? 'INR',
    packRaw: specs['Pack'] ?? '',
    pack: parsePack(specs['Pack']),

    inStock,
    stockLabel: stockText,
    unitsInStock: (() => {
      const n = Number(specs['Units in stock']);
      return Number.isFinite(n) ? n : null;
    })(),

    location: specs['Ships from'] ?? '',
    views: (() => {
      const n = Number(specs['Views']);
      return Number.isFinite(n) ? n : null;
    })(),
    seller: norm(ldOffer.seller?.name),

    images,
    specs,
    scrapedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------
async function downloadImages(product, errors) {
  const base = `${product.sourceId}`;
  const slugPart = slugToFilenamePart(product.sourceSlug);
  let index = 0;

  for (const image of product.images) {
    index += 1;
    try {
      await sleep(DELAY_MS);
      const { buffer, contentType } = await fetchBinary(image.url);
      const ext = extensionFor(image.url, contentType);
      const filename = [base, slugPart, String(index)].filter(Boolean).join('-') + ext;
      const abs = path.join(IMAGES_DIR, filename);
      await fs.writeFile(abs, buffer);
      image.localPath = path.posix.join('scraped-data/images', filename);
      image.bytes = buffer.length;
      image.contentType = String(contentType).split(';')[0].trim();
    } catch (error) {
      image.localPath = null;
      errors.push({ productId: product.sourceId, stage: 'image', url: image.url, message: error.message });
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  console.log('[scrape] discovering products from sitemap-wholesale.xml…');
  let targets = await discoverFromSitemap();
  console.log(`[scrape] sitemap: ${targets.length} product URLs`);

  await sleep(DELAY_MS);
  console.log('[scrape] reading /ourproduct/<Kind> pages for source categories…');
  const kindById = await discoverKindMap();
  console.log(`[scrape] kind map: ${kindById.size} products across ${SOURCE_KINDS.join(', ')}`);

  const sitemapIds = new Set(targets.map((t) => t.id));
  const kindOnly = [...kindById.keys()].filter((id) => !sitemapIds.has(id));
  if (kindOnly.length) {
    console.warn(`[scrape] WARNING: ${kindOnly.length} product(s) on category pages but not in sitemap: ${kindOnly.join(', ')}`);
  }

  if (ONLY_IDS) targets = targets.filter((t) => ONLY_IDS.includes(t.id));
  if (LIMIT !== null) targets = targets.slice(0, LIMIT);
  console.log(`[scrape] scraping ${targets.length} product page(s), delay ${DELAY_MS}ms\n`);

  const errors = [];
  const products = [];

  for (const [i, target] of targets.entries()) {
    const label = `[${i + 1}/${targets.length}] #${target.id}`;
    try {
      await sleep(DELAY_MS);
      const html = await fetchText(target.url);
      const product = parseProductPage(html, target, kindById.get(target.id));
      products.push(product);
      console.log(
        `${label} ${product.name || '(no name)'} — ${product.sourceCategory || '?'}/${product.sourceForm || '?'} ` +
          `₹${product.price ?? '?'} ${product.pack.raw || ''} ${product.inStock ? 'in-stock' : 'OUT'} ` +
          `imgs=${product.images.length}`
      );
      if (DOWNLOAD_IMAGES && product.images.length) await downloadImages(product, errors);
    } catch (error) {
      errors.push({ productId: target.id, stage: 'page', url: target.url, message: error.message });
      console.log(`${label} FAILED: ${error.message}`);
    }
  }

  const payload = {
    source: BASE,
    scrapedAt: new Date().toISOString(),
    productCount: products.length,
    errors,
    products,
  };
  await fs.writeFile(PRODUCTS_JSON, JSON.stringify(payload, null, 2), 'utf8');

  // ---- summary ----
  const imagesDownloaded = products.reduce(
    (n, p) => n + p.images.filter((img) => img.localPath).length,
    0
  );
  // Failures are counted from the error log, so a --no-images run (where
  // every image is intentionally left un-downloaded) is not reported as failing.
  const imagesFailed = errors.filter((e) => e.stage === 'image').length;
  const byCategory = {};
  for (const p of products) {
    const key = p.sourceCategory || '(unknown)';
    byCategory[key] = (byCategory[key] ?? 0) + 1;
  }
  const over5 = products.filter((p) => p.images.length > 5);

  console.log('\n================ SCRAPE SUMMARY ================');
  console.log(`Products scraped      : ${products.length}`);
  console.log(`By source category    : ${Object.entries(byCategory).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log(`Images downloaded     : ${imagesDownloaded}${DOWNLOAD_IMAGES ? '' : ' (skipped: --no-images)'}`);
  if (imagesFailed) console.log(`Images failed         : ${imagesFailed}`);
  console.log(`Errors                : ${errors.length}`);
  console.log(`In stock / out        : ${products.filter((p) => p.inStock).length} / ${products.filter((p) => !p.inStock).length}`);
  console.log(`Hindi-named products  : ${products.filter((p) => p.nameLanguage === 'hi').length}`);
  console.log(`Missing price         : ${products.filter((p) => p.price === null).length}`);
  console.log(`Missing description   : ${products.filter((p) => !p.descriptionText).length}`);
  console.log(`Missing images        : ${products.filter((p) => p.images.length === 0).length}`);
  if (over5.length) console.log(`Products with >5 images (dest max is 5): ${over5.map((p) => `#${p.sourceId}`).join(', ')}`);
  if (errors.length) {
    console.log('\n--- errors ---');
    for (const e of errors) console.log(`  [${e.stage}] #${e.productId} ${e.url} -> ${e.message}`);
  }
  console.log(`\nWrote ${PRODUCTS_JSON}`);
  console.log(`Images in ${IMAGES_DIR}`);
  console.log('===============================================');
}

main().catch((error) => {
  console.error('[scrape] fatal:', error);
  process.exitCode = 1;
});
