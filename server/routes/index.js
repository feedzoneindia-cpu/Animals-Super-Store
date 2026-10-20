import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import listingRoutes from './listing.routes.js';
import blogRoutes from './blog.routes.js';
import reportRoutes from './report.routes.js';
import adminRoutes from './admin.routes.js';
import orderRoutes from './order.routes.js';
import inquiryRoutes from './inquiry.routes.js';
import settingRoutes from './setting.routes.js';
import { rebuildOnContentChange } from '../middleware/rebuildOnContentChange.js';

const router = Router();

// Keep the storefront's sitemap/prerendered pages current when products or posts change.
router.use(['/listings', '/blogs', '/admin/listings', '/admin/blogs'], rebuildOnContentChange);

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/listings', listingRoutes);
router.use('/blogs', blogRoutes);
router.use('/reports', reportRoutes);
router.use('/orders', orderRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/settings', settingRoutes);
router.use('/admin', adminRoutes);

export default router;
