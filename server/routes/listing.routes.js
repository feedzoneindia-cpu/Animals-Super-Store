import { Router } from 'express';
import {
  getListings,
  getListingBySlug,
  createListing,
  updateListing,
  deleteListing,
  markListingSold,
  archiveListing,
  getManagedListing,
  parseExistingImages,
} from '../controllers/listing.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { loadManagedListing } from '../middleware/listingAccess.js';
import { uploadListingImages } from '../middleware/upload.middleware.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  createListingSchema,
  updateListingSchema,
  listListingsQuerySchema,
} from '../validators/listing.validator.js';

const router = Router();

// Public — anyone can browse, search, filter and read listings.
router.get('/', validateQuery(listListingsQuerySchema), getListings);
router.get('/:slug', getListingBySlug);

/**
 * Listing management is ADMIN-ONLY. Every route below is guarded by
 * `authenticate` + `requireAdmin`, so the server decides the role from the
 * authenticated session — a role sent by the client is never trusted.
 * Unauthenticated -> 401, authenticated non-admin -> 403.
 */
const adminOnly = [authenticate, requireAdmin()];

router.get('/:id/manage', adminOnly, loadManagedListing, getManagedListing);
router.post(
  '/',
  adminOnly,
  uploadListingImages,
  parseExistingImages,
  validate(createListingSchema),
  createListing
);
router.put(
  '/:id',
  adminOnly,
  loadManagedListing,
  uploadListingImages,
  parseExistingImages,
  validate(updateListingSchema),
  updateListing
);
router.patch('/:id/sold', adminOnly, loadManagedListing, markListingSold);
router.patch('/:id/archive', adminOnly, loadManagedListing, archiveListing);
router.delete('/:id', adminOnly, loadManagedListing, deleteListing);

export default router;
