import multer from 'multer';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_LISTING_IMAGES,
} from '../constants/listings.js';
import { ApiError } from '../utils/ApiError.js';

function fileFilter(req, file, cb) {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(
    ApiError.unprocessable(
      `"${file.originalname}" is not a supported image type. Allowed types: JPEG, PNG, WebP.`
    )
  );
}

/**
 * Multipart middleware for listing images. Files stay in memory as buffers —
 * nothing is written to disk and no binaries ever reach MongoDB.
 */
export const uploadListingImages = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: MAX_LISTING_IMAGES,
  },
  fileFilter,
}).array('images', MAX_LISTING_IMAGES);

/** Single-image upload for blog cover images. */
export const uploadBlogCover = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter,
}).single('coverImage');

/** Single-image upload for rich text editor inline images (admin only). */
export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter,
}).single('image');
