import { isValidObjectId } from 'mongoose';
import * as blogService from '../services/blog.service.js';
import { uploadImage } from '../services/cloudinary.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Multipart adapter: parses `tags` (comma-separated string) and
 * `existingCoverImage` (JSON string) before zod validation sees them.
 */
export const parseBlogFields = (req, res, next) => {
  if (typeof req.body.tags === 'string') {
    req.body.tags = req.body.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  if (typeof req.body.existingCoverImage === 'string' && req.body.existingCoverImage !== '') {
    try {
      req.body.existingCoverImage = JSON.parse(req.body.existingCoverImage);
    } catch {
      return next(
        ApiError.unprocessable('Validation failed', [
          { field: 'existingCoverImage', message: 'Invalid cover image data' },
        ])
      );
    }
  }
  return next();
};

/** Loads a blog by id for admin endpoints. */
export const loadBlog = asyncHandler(async (req, res, next) => {
  if (!isValidObjectId(req.params.id)) {
    throw ApiError.badRequest('Invalid blog id');
  }
  const blog = await blogService.adminGetBlog(req.params.id);
  req.blog = blog;
  return next();
});

// ---- Public ----

export const listBlogs = asyncHandler(async (req, res) => {
  const { blogs, pagination } = await blogService.searchPublishedBlogs(req.validatedQuery);
  return sendSuccess(res, { message: 'Blogs fetched successfully', data: { blogs, pagination } });
});

export const getBlogBySlug = asyncHandler(async (req, res) => {
  const blog = await blogService.getPublishedBlogBySlug(req.params.slug);
  return sendSuccess(res, { message: 'Blog fetched successfully', data: { blog } });
});

// ---- Admin ----

export const adminList = asyncHandler(async (req, res) => {
  const { blogs, pagination } = await blogService.adminListBlogs(req.validatedQuery);
  return sendSuccess(res, { message: 'Blogs fetched successfully', data: { blogs, pagination } });
});

export const adminGetOne = asyncHandler(async (req, res) => {
  return sendSuccess(res, { message: 'Blog fetched successfully', data: { blog: req.blog } });
});

export const createBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.createBlog(req.user, req.body, req.file);
  return sendSuccess(res, {
    status: 201,
    message: `Blog ${blog.status === 'published' ? 'published' : 'saved as draft'} successfully`,
    data: { blog },
  });
});

export const updateBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.updateBlog(req.blog, req.body, req.file);
  return sendSuccess(res, { message: 'Blog updated successfully', data: { blog } });
});

export const deleteBlog = asyncHandler(async (req, res) => {
  await blogService.deleteBlog(req.blog);
  return sendSuccess(res, { message: 'Blog deleted successfully' });
});

export const publishBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.publishBlog(req.blog);
  return sendSuccess(res, { message: 'Blog published successfully', data: { blog } });
});

export const unpublishBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.unpublishBlog(req.blog);
  return sendSuccess(res, { message: 'Blog unpublished — back to draft', data: { blog } });
});

export const archiveBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.archiveBlog(req.blog);
  return sendSuccess(res, { message: 'Blog archived successfully', data: { blog } });
});

/** Inline image upload for the rich text editor (admin only). */
export const uploadEditorImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.unprocessable('No image file received');
  }
  const image = await uploadImage(req.file.buffer, 'Animals-super-store/editor');
  return sendSuccess(res, { message: 'Image uploaded successfully', data: { image } });
});
