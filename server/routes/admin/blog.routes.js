import { Router } from 'express';
import {
  adminList,
  adminGetOne,
  createBlog,
  updateBlog,
  deleteBlog,
  publishBlog,
  unpublishBlog,
  archiveBlog,
  parseBlogFields,
  loadBlog,
} from '../../controllers/blog.controller.js';
import { uploadBlogCover } from '../../middleware/upload.middleware.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import {
  createBlogSchema,
  updateBlogSchema,
  adminListBlogsQuerySchema,
} from '../../validators/blog.validator.js';

const router = Router();

router.get('/', validateQuery(adminListBlogsQuerySchema), adminList);
router.post('/', uploadBlogCover, parseBlogFields, validate(createBlogSchema), createBlog);
router.get('/:id', loadBlog, adminGetOne);
router.put('/:id', loadBlog, uploadBlogCover, parseBlogFields, validate(updateBlogSchema), updateBlog);
router.patch('/:id/publish', loadBlog, publishBlog);
router.patch('/:id/unpublish', loadBlog, unpublishBlog);
router.patch('/:id/archive', loadBlog, archiveBlog);
router.delete('/:id', loadBlog, deleteBlog);

export default router;
