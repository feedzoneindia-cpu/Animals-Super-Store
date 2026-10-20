import { Router } from 'express';
import { updateMe } from '../controllers/auth.controller.js';
import { changePassword, deleteAccount } from '../controllers/setting.controller.js';
import { getMyListings } from '../controllers/listing.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { validate, validateQuery } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/auth.validator.js';
import { changePasswordSchema, deleteAccountSchema } from '../validators/setting.validator.js';
import { myListingsQuerySchema } from '../validators/listing.validator.js';

const router = Router();

// Listing management is admin-only, and "My Listings" is the admin's own
// listing workspace — the page is admin-guarded too.
router.get('/me/listings', authenticate, requireAdmin(), validateQuery(myListingsQuerySchema), getMyListings);
router.put('/me', authenticate, validate(updateProfileSchema), updateMe);
router.put('/me/password', authenticate, validate(changePasswordSchema), changePassword);
router.delete('/me', authenticate, validate(deleteAccountSchema), deleteAccount);

export default router;
