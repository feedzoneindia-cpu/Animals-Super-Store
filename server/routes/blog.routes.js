import { Router } from 'express';
import { listBlogs, getBlogBySlug } from '../controllers/blog.controller.js';
import { validateQuery } from '../middleware/validate.js';
import { listBlogsQuerySchema } from '../validators/blog.validator.js';

const router = Router();

// Public — published blogs only.
router.get('/', validateQuery(listBlogsQuerySchema), listBlogs);
router.get('/:slug', getBlogBySlug);

export default router;
