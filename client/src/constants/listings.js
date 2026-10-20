/**
 * Listing business rules.
 * Listings cover Animals-related PRODUCTS/ITEMS and, since the V1 scope change,
 * live Animals too — the "Animals" category carries its own set of fields.
 */

export const LISTING_CATEGORIES = [
  {
    name: 'Animals Food',
    description: 'Nutritious feed, treats, and supplements for pets and livestock.',
  },
  {
    name: 'Animals Accessories',
    description: 'Collars, beds, toys, grooming supplies, and everyday comfort items.',
  },
  {
    name: 'Animals Equipment',
    description: 'Cages, tanks, harnesses, feeders, and practical Animals-care gear.',
  },
  {
    name: 'Animals',
    description: 'List Animals and help them find the right home.',
  },
  {
    name: 'Other',
    description: 'Any other Animals-related product or item that fits the marketplace.',
  },
];

export const LISTING_CATEGORY_NAMES = LISTING_CATEGORIES.map((category) => category.name);

/** The one category that switches the listing form to Animals fields. */
export const Animals_CATEGORY = 'Animals';

/**
 * Categories rendered as cards in the homepage "Browse Categories" grid.
 *
 * "Animals" is hidden from this public grid only. It stays in
 * LISTING_CATEGORIES so everything Animals-related keeps working: the admin
 * listing form can still create/edit Animals listings, the admin and public
 * category filters still offer it, and live-Animals cart protection, Animals
 * detail/adoption pages, and existing Animals records are untouched.
 */
export const BROWSE_CATEGORIES = LISTING_CATEGORIES.filter(
  (category) => category.name !== Animals_CATEGORY
);

/** Mirrors the server enum — "Other" keeps the list open-ended. */
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

/** Age is stored as a whole number of months; the form takes months or years. */
export const MAX_AGE_MONTHS = 600; // 50 years

/** True when a listing (or a chosen category name) is an Animals listing. */
export function isAnimalsListing(listing) {
  return listing?.category === Animals_CATEGORY;
}

/** The only listing statuses that exist — there is no approval workflow. */
export const LISTING_STATUSES = ['active', 'sold', 'archived'];

export const LISTING_DEFAULT_STATUS = 'active';

export const LISTING_SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

export const DEFAULT_PAGE_SIZE = 12;

export const MAX_LISTING_IMAGES = 5;

/** Tailwind classes for the three possible listing statuses. */
export const LISTING_STATUS_STYLES = {
  active: 'bg-brand-50 text-brand-800',
  sold: 'bg-red-50 text-red-700',
  archived: 'bg-gray-100 text-gray-600',
};
