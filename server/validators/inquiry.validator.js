import { z } from 'zod';
import { INQUIRY_STATUSES } from '../models/Inquiry.js';
import { preprocessEmpty } from '../middleware/validate.js';

export const createInquirySchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address')
    .max(150, 'Email cannot exceed 150 characters')
    .toLowerCase(),
  phone: z
    .string()
    .trim()
    .max(25, 'Phone cannot exceed 25 characters')
    .optional()
    .or(z.literal('')),
  subject: z
    .string({ required_error: 'Subject is required' })
    .trim()
    .min(2, 'Subject must be at least 2 characters')
    .max(150, 'Subject cannot exceed 150 characters'),
  message: z
    .string({ required_error: 'Message is required' })
    .trim()
    .min(5, 'Message must be at least 5 characters')
    .max(3000, 'Message cannot exceed 3000 characters'),
});

export const updateInquiryStatusSchema = z.object({
  status: z.enum(INQUIRY_STATUSES, {
    message: `Status must be one of: ${INQUIRY_STATUSES.join(', ')}`,
  }),
});

export const listInquiriesQuerySchema = z.object({
  status: preprocessEmpty(z.enum(INQUIRY_STATUSES, { message: 'Invalid status filter' })),
  q: preprocessEmpty(z.string().trim().min(1).max(100, 'Search term is too long')),
  page: z.coerce.number({ message: 'page must be a number' }).int().min(1).max(10000).default(1),
  limit: z.coerce.number({ message: 'limit must be a number' }).int().min(1).max(100).default(10),
});
