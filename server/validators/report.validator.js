import { z } from 'zod';
import {
    Animals_GENDERS,
    Animals_TYPES,
    LISTING_CATEGORIES,
    LISTING_STATUSES,
    MAX_AGE_MONTHS,
} from '../constants/listings.js';
import { MAX_REPORT_DESCRIPTION_LENGTH, REPORT_REASONS, REPORT_STATUSES } from '../constants/reports.js';
import { preprocessEmpty } from '../middleware/validate.js';

const objectIdString = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');

export const createReportSchema = z.object({
  listing: objectIdString,
  reason: z.enum(REPORT_REASONS, {
    message: `Reason must be one of: ${REPORT_REASONS.join(', ')}`,
  }),
  description: z
    .string()
    .trim()
    .max(MAX_REPORT_DESCRIPTION_LENGTH, `Description must be at most ${MAX_REPORT_DESCRIPTION_LENGTH} characters`)
    .optional()
    .or(z.literal('')),
});

export const adminListReportsQuerySchema = z.object({
  status: preprocessEmpty(z.enum(REPORT_STATUSES, { message: 'Invalid status filter' })),
  page: z.coerce.number({ message: 'page must be a number' }).int().min(1).max(10000).default(1),
  limit: z.coerce.number({ message: 'limit must be a number' }).int().min(1).max(48).default(12),
});

export const updateReportStatusSchema = z.object({
  status: z.enum(REPORT_STATUSES, {
    message: `Status must be one of: ${REPORT_STATUSES.join(', ')}`,
  }),
});

export const adminListUsersQuerySchema = z.object({
  q: preprocessEmpty(z.string().trim().min(1).max(100, 'Search term is too long')),
  role: preprocessEmpty(z.enum(['USER', 'ADMIN'], { message: 'Invalid role filter' })),
  status: preprocessEmpty(z.enum(['active', 'blocked'], { message: 'Invalid status filter' })),
  page: z.coerce.number({ message: 'page must be a number' }).int().min(1).max(10000).default(1),
  limit: z.coerce.number({ message: 'limit must be a number' }).int().min(1).max(48).default(12),
});

export const adminListListingsQuerySchema = z.object({
  q: preprocessEmpty(z.string().trim().min(1).max(100, 'Search term is too long')),
  category: preprocessEmpty(z.enum(LISTING_CATEGORIES, { message: 'Invalid category filter' })),
  status: preprocessEmpty(z.enum(LISTING_STATUSES, { message: 'Invalid status filter' })),
  location: preprocessEmpty(z.string().trim().min(1).max(100)),
  // Animals filters so admins can moderate Animals listings the same way.
  AnimalsType: preprocessEmpty(z.enum(Animals_TYPES, { message: 'Invalid Animals type filter' })),
  gender: preprocessEmpty(z.enum(Animals_GENDERS, { message: 'Invalid gender filter' })),
  breed: preprocessEmpty(z.string().trim().min(1).max(60)),
  minAgeMonths: preprocessEmpty(z.coerce.number({ message: 'minAgeMonths must be a number' }).int().min(0).max(MAX_AGE_MONTHS)),
  maxAgeMonths: preprocessEmpty(z.coerce.number({ message: 'maxAgeMonths must be a number' }).int().min(0).max(MAX_AGE_MONTHS)),
  page: z.coerce.number({ message: 'page must be a number' }).int().min(1).max(10000).default(1),
  limit: z.coerce.number({ message: 'limit must be a number' }).int().min(1).max(48).default(12),
});
