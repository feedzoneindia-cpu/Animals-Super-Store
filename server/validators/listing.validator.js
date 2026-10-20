import { z } from 'zod';
import {
    Animals_CATEGORY,
    Animals_GENDERS,
    Animals_TYPES,
    LISTING_CATEGORIES,
    LISTING_STATUSES,
    MAX_AGE_MONTHS,
    MAX_LISTING_IMAGES,
} from '../constants/listings.js';
import { preprocessEmpty } from '../middleware/validate.js';

const categoryEnum = z.enum(LISTING_CATEGORIES, {
  message: `Category must be one of: ${LISTING_CATEGORIES.join(', ')}`,
});

const AnimalsTypeEnum = z.enum(Animals_TYPES, {
  message: `Animals type must be one of: ${Animals_TYPES.join(', ')}`,
});

const AnimalsGenderEnum = z.enum(Animals_GENDERS, {
  message: `Gender must be one of: ${Animals_GENDERS.join(', ')}`,
});

const imageRefSchema = z.object({
  url: z.string().url('Image URL is invalid'),
  publicId: z.string().default(''),
});

/** Shared listing fields — multipart sends everything as strings, hence coerce. */
const listingFields = {
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be at most 100 characters'),
  category: categoryEnum,
  description: z
    .string()
    .trim()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description must be at most 5000 characters'),
  price: z.coerce
    .number({ message: 'Price must be a number' })
    .int('Price must be a whole number')
    .min(0, 'Price cannot be negative')
    .max(10_000_000, 'Price must be at most ₹1,00,00,000'),
  stockQuantity: preprocessEmpty(
    z.coerce
      .number({ message: 'Stock quantity must be a number' })
      .int('Stock quantity must be a whole number')
      .min(0, 'Stock quantity cannot be negative')
      .max(100_000, 'Stock quantity must be at most 1,00,000')
  ),
  location: z.string().trim().min(2, 'Location is required').max(100, 'Location must be at most 100 characters'),
  sellerName: z.string().trim().min(2, 'Seller name is required').max(50, 'Seller name must be at most 50 characters'),
  contactNumber: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, 'Please provide a valid contact number'),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address')
    .optional()
    .or(z.literal('')),
  additionalDetails: z.string().trim().max(2000, 'Additional details must be at most 2000 characters').optional().or(z.literal('')),
  // Animals-only fields. Optional at the field level so product listings are
  // never forced to supply them; the `AnimalsRules` refinement below makes
  // them mandatory when — and only when — category is "Animalss".
  // `preprocessEmpty` turns multipart's "" into undefined so a blank select
  // is treated as "not provided" rather than coercing to 0.
  AnimalsType: preprocessEmpty(AnimalsTypeEnum),
  breed: preprocessEmpty(z.string().trim().min(2, 'Breed is required').max(60, 'Breed must be at most 60 characters')),
  ageMonths: preprocessEmpty(
    z.coerce
      .number({ message: 'Age must be a number' })
      .int('Age must be a whole number of months')
      .min(0, 'Age cannot be negative')
      .max(MAX_AGE_MONTHS, `Age must be at most ${MAX_AGE_MONTHS} months`)
  ),
  gender: preprocessEmpty(AnimalsGenderEnum),
  // Images kept from a previous version (edit flow) — validated as JSON in the
  // controller adapter, then re-checked here.
  existingImages: z.array(imageRefSchema).max(MAX_LISTING_IMAGES).optional(),
};

/**
 * Animals fields are required for the "Animalss" category and meaningless for
 * every other one. Product listings keep validating exactly as before.
 */
function AnimalsRules(value, ctx) {
  if (value.category !== Animals_CATEGORY) return;

  const required = [
    ['AnimalsType', 'Animals type is required for Animals listings'],
    ['breed', 'Breed is required for Animals listings'],
    ['ageMonths', 'Age is required for Animals listings'],
    ['gender', 'Gender is required for Animals listings'],
  ];
  for (const [field, message] of required) {
    if (value[field] === undefined || value[field] === null || value[field] === '') {
      ctx.addIssue({ code: 'custom', path: [field], message });
    }
  }
}

export const createListingSchema = z.object(listingFields).superRefine(AnimalsRules);

export const updateListingSchema = z.object(listingFields).superRefine(AnimalsRules);

export const listListingsQuerySchema = z.object({
  q: preprocessEmpty(z.string().trim().min(1).max(100, 'Search term is too long')),
  category: preprocessEmpty(categoryEnum),
  location: preprocessEmpty(z.string().trim().min(1).max(100)),
  minPrice: preprocessEmpty(z.coerce.number({ message: 'minPrice must be a number' }).int().min(0)),
  maxPrice: preprocessEmpty(z.coerce.number({ message: 'maxPrice must be a number' }).int().min(0)),
  // Animals filters — harmless on product searches (they simply never match).
  AnimalsType: preprocessEmpty(AnimalsTypeEnum),
  gender: preprocessEmpty(AnimalsGenderEnum),
  breed: preprocessEmpty(z.string().trim().min(1).max(60)),
  minAgeMonths: preprocessEmpty(z.coerce.number({ message: 'minAgeMonths must be a number' }).int().min(0).max(MAX_AGE_MONTHS)),
  maxAgeMonths: preprocessEmpty(z.coerce.number({ message: 'maxAgeMonths must be a number' }).int().min(0).max(MAX_AGE_MONTHS)),
  sort: z.enum(['latest', 'oldest', 'price-asc', 'price-desc']).default('latest'),
  page: z.coerce.number({ message: 'page must be a number' }).int().min(1).max(10000).default(1),
  limit: z.coerce.number({ message: 'limit must be a number' }).int().min(1).max(48).default(12),
});

export const myListingsQuerySchema = z.object({
  status: preprocessEmpty(z.enum(LISTING_STATUSES, { message: 'Invalid status filter' })),
  sort: z.enum(['latest', 'oldest', 'price-asc', 'price-desc']).default('latest'),
  page: z.coerce.number({ message: 'page must be a number' }).int().min(1).max(10000).default(1),
  limit: z.coerce.number({ message: 'limit must be a number' }).int().min(1).max(48).default(12),
});
