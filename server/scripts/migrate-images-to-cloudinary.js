/**
 * One-off migration: re-host every non-Cloudinary image URL stored in MongoDB
 * on Cloudinary and replace it with Cloudinary's `secure_url`.
 *
 *   npm run migrate-images              # dry run — lists what would change
 *   npm run migrate-images -- --commit  # upload + write
 *
 * Covers: Listing.images[], Blog.coverImage, <img src> inside Blog.content,
 * Order.items[].image. URLs already on res.cloudinary.com are skipped, so the
 * script is safe to re-run. A failed upload leaves the old URL in place.
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Blog from '../models/Blog.js';
import Listing from '../models/Listing.js';
import Order from '../models/Order.js';
import {
    CLOUDINARY_URL_PATTERN,
    isCloudinaryConfigured,
    uploadImageFromUrl,
} from '../services/cloudinary.service.js';

const COMMIT = process.argv.includes('--commit');
const cache = new Map();
const stats = { found: 0, uploaded: 0, failed: 0 };

const isRemote = (url) => typeof url === 'string' && /^https?:\/\//i.test(url) && !CLOUDINARY_URL_PATTERN.test(url);

async function rehost(url, folder) {
  stats.found += 1;
  if (!COMMIT) {
    console.log(`  would upload ${url}`);
    return null;
  }
  if (!cache.has(url)) {
    cache.set(
      url,
      uploadImageFromUrl(url, `Animals-super-store/${folder}`).catch((e) => {
        stats.failed += 1;
        console.error(`  FAILED ${url}: ${e.message}`);
        return null;
      })
    );
  }
  const result = await cache.get(url);
  if (result) stats.uploaded += 1;
  return result;
}

async function migrateListings() {
  console.log('[listings]');
  for (const doc of await Listing.find({ 'images.url': { $not: CLOUDINARY_URL_PATTERN } })) {
    let changed = false;
    for (const img of doc.images) {
      if (!isRemote(img.url)) continue;
      const res = await rehost(img.url, 'listings');
      if (res) {
        img.url = res.url;
        img.publicId = res.publicId || img.publicId;
        changed = true;
      }
    }
    if (changed) await doc.save();
  }
}

async function migrateBlogs() {
  console.log('[blogs]');
  for (const doc of await Blog.find({})) {
    let changed = false;
    if (isRemote(doc.coverImage?.url)) {
      const res = await rehost(doc.coverImage.url, 'blog');
      if (res) {
        doc.coverImage = { url: res.url, publicId: res.publicId };
        changed = true;
      }
    }
    const srcs = [...new Set([...(doc.content ?? '').matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]))];
    let html = doc.content ?? '';
    for (const src of srcs.filter(isRemote)) {
      const res = await rehost(src, 'blog');
      if (res) {
        html = html.split(src).join(res.url);
        changed = true;
      }
    }
    if (changed) {
      doc.content = html;
      await doc.save();
    }
  }
}

async function migrateOrders() {
  console.log('[orders]');
  for (const doc of await Order.find({ 'items.image': { $regex: '^https?://', $not: CLOUDINARY_URL_PATTERN } })) {
    let changed = false;
    for (const item of doc.items) {
      if (!isRemote(item.image)) continue;
      const res = await rehost(item.image, 'listings');
      if (res) {
        item.image = res.url;
        changed = true;
      }
    }
    if (changed) await doc.save();
  }
}

async function main() {
  if (COMMIT && !isCloudinaryConfigured()) {
    console.error('Cloudinary is not configured (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).');
    process.exit(1);
  }
  console.log(COMMIT ? 'COMMIT mode' : 'DRY RUN (add --commit to apply)');
  await mongoose.connect(env.mongoUri);
  await migrateListings();
  await migrateBlogs();
  await migrateOrders();
  console.log(`\nfound=${stats.found} uploaded=${stats.uploaded} failed=${stats.failed}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
