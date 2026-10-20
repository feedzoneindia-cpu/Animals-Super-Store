/** Fixed V1 listing business rules — single source of truth for the backend. */
export const LISTING_CATEGORIES = [
  'Animals Food',
  'Animals Accessories',
  'Animals Equipment',
  'Animalss',
  'Other',
];

/**
 * The one category that carries Animals-specific fields. Every other category
 * keeps the original product/item fields — Animals fields are never required
 * (or accepted) for them.
 */
export const Animals_CATEGORY = 'Animalss';

/** Free-text "Other" is always allowed — these are suggestions, not a whitelist wall. */
export const Animals_TYPES = [
  'Dog',
  'Cat',
  'Rabbit',
  'Bird',
  'Fish',
  'Cow',
  'Buffalo',
  'Goat',
  'Sheep',
  'Horse',
  'Other',
];

export const Animals_GENDERS = ['Male', 'Female', 'Pair', 'Unknown'];

/** Age is stored in months so it stays filterable; the UI renders it as text. */
export const MAX_AGE_MONTHS = 600; // 50 years

export const LISTING_STATUSES = ['active', 'sold', 'archived'];

export const LISTING_DEFAULT_STATUS = 'active';

/** Statuses visible through the public listing detail endpoint. */
export const PUBLICLY_VISIBLE_STATUSES = ['active', 'sold'];

export const LISTING_SORT_MAP = {
  latest: '-createdAt',
  oldest: 'createdAt',
  'price-asc': 'price',
  'price-desc': '-price',
};

export const MAX_LISTING_IMAGES = 5;

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per image

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
