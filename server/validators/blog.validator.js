import { z } from 'zod';
import { preprocessEmpty } from '../middleware/validate.js';

const BLOG_STATUSES = ['draft', 'published', 'archived'];

/** Shared blog fields — multipart sends everything as strings, hence coerce. */
const blogFields = {
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title must be at most 150 characters'),
  excerpt: z
    .string()
    .trim()
    .min(10, 'Excerpt must be at least 10 characters')
    .max(300, 'Excerpt must be at most 300 characters'),
  content: z.string().min(20, 'Content is too short — write at least a couple of sentences'),
  category: z.string().trim().max(50, 'Category must be at most 50 characters').optional().or(z.literal('')),
  // Parsed from a comma-separated string by the controller adapter.
  tags: z.array(z.string().trim().min(1).max(30, 'Each tag must be at most 30 characters')).max(8, 'A blog can have at most 8 tags').optional(),
  status: z.enum(BLOG_STATUSES).optional(),
  // Kept cover image during an edit — validated as JSON in the adapter.
  existingCoverImage: z
    .object({ url: z.string().url(), publicId: z.string().default('') })
    .optional()
    .or(z.literal('')),
};

export const createBlogSchema = z.object(blogFields);

export const updateBlogSchema = z.object(blogFields);

export const listBlogsQuerySchema = z.object({
  q: preprocessEmpty(z.string().trim().min(1).max(100, 'Search term is too long')),
  category: preprocessEmpty(z.string().trim().min(1).max(50)),
  sort: z.enum(['latest', 'oldest']).default('latest'),
  page: z.coerce.number({ message: 'page must be a number' }).int().min(1).max(10000).default(1),
  limit: z.coerce.number({ message: 'limit must be a number' }).int().min(1).max(24).default(9),
});

export const adminListBlogsQuerySchema = z.object({
  q: preprocessEmpty(z.string().trim().min(1).max(100)),
  status: preprocessEmpty(z.enum(BLOG_STATUSES, { message: 'Invalid status filter' })),
  page: z.coerce.number({ message: 'page must be a number' }).int().min(1).max(10000).default(1),
  limit: z.coerce.number({ message: 'limit must be a number' }).int().min(1).max(48).default(12),
});
