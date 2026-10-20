import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { uploadSingleImage } from '../middleware/upload.middleware.js';
import { uploadEditorImage } from '../controllers/blog.controller.js';
import { getAdminStats } from '../controllers/adminStats.controller.js';
import blogRoutes from './admin/blog.routes.js';
import userRoutes from './admin/user.routes.js';
import listingRoutes from './admin/listing.routes.js';
import reportRoutes from './admin/report.routes.js';
import orderRoutes from './admin/order.routes.js';
import settingRoutes from './admin/setting.routes.js';

/**
 * All /api/admin routes require authentication AND the ADMIN role.
 * Every admin sub-router inherits this protection.
 */
const router = Router();

router.use(authenticate, requireAdmin());

router.get('/stats', getAdminStats);
router.use('/blogs', blogRoutes);
router.use('/users', userRoutes);
router.use('/listings', listingRoutes);
router.use('/reports', reportRoutes);
router.use('/orders', orderRoutes);
router.use('/settings', settingRoutes);
router.post('/uploads', uploadSingleImage, uploadEditorImage);

export default router;
