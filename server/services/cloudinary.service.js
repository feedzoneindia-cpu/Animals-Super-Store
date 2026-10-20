import cloudinary from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

export function isCloudinaryConfigured() {
  const { cloud_name, api_key, api_secret } = cloudinary.config();
  return Boolean(cloud_name && api_key && api_secret);
}

function assertConfigured() {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(
      503,
      'Image uploading is not set up on this server. Cloudinary credentials are missing.'
    );
  }
}

/**
 * Uploads an image buffer to Cloudinary and returns { url, publicId }.
 * Only the secure URL and public ID are ever stored in MongoDB.
 */
export function uploadImage(buffer, folder) {
  assertConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          console.error('[cloudinary] upload failed:', error?.message ?? error);
          reject(new ApiError(502, 'Image upload failed. Please try again.'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Uploads a remote image (any http/https URL) to Cloudinary and returns
 * { url, publicId } where url is Cloudinary's `secure_url`. Already-Cloudinary
 * URLs are returned untouched, so it is safe to call repeatedly (idempotent).
 */
export const CLOUDINARY_URL_PATTERN = /^https:\/\/res\.cloudinary\.com\//i;

export async function uploadImageFromUrl(sourceUrl, folder) {
  assertConfigured();
  if (CLOUDINARY_URL_PATTERN.test(sourceUrl)) return { url: sourceUrl, publicId: '' };
  try {
    const result = await cloudinary.uploader.upload(sourceUrl, { folder, resource_type: 'image' });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    console.error(`[cloudinary] remote upload failed for ${sourceUrl}:`, error?.message ?? error);
    throw new ApiError(502, 'Image upload failed. Please try again.');
  }
}

/** Best-effort cleanup of a Cloudinary asset — never blocks the main flow. */
export async function destroyImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`[cloudinary] failed to delete asset ${publicId}:`, error?.message ?? error);
  }
}

export async function destroyImages(images) {
  await Promise.all((images ?? []).map((image) => destroyImage(image.publicId)));
}
