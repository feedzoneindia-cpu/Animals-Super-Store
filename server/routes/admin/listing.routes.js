import { Router } from 'express';
import {
  adminListListings,
  adminArchiveListing,
  adminDeleteListing,
  loadAdminListing,
} from '../../controllers/adminListing.controller.js';
import { validateQuery } from '../../middleware/validate.js';
import { adminListListingsQuerySchema } from '../../validators/report.validator.js';

const router = Router();

router.get('/', validateQuery(adminListListingsQuerySchema), adminListListings);
router.patch('/:listingId/archive', loadAdminListing, adminArchiveListing);
router.delete('/:listingId', loadAdminListing, adminDeleteListing);

// NOTE: there is intentionally NO approve/reject endpoint or approval
// queue — listings go public the moment they are created.
export default router;
