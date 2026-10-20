import Listing from '../models/Listing.js';
import Report from '../models/Report.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/slug.js';
import { deleteListing } from './listing.service.js';

function buildPaginationMeta(page, limit, totalResults) {
  return {
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
  };
}

/**
 * Admin listing search — every status is visible so admins can moderate
 * sold and archived listings too. Filtering only; there is NO approve or
 * reject action anywhere in this module.
 */
export async function adminSearchListings(query) {
  const {
    q,
    category,
    status,
    location,
    AnimalsType,
    gender,
    breed,
    minAgeMonths,
    maxAgeMonths,
    page,
    limit,
  } = query;

  const filter = {};
  if (q) {
    filter.title = { $regex: escapeRegex(q), $options: 'i' };
  }
  if (category) {
    filter.category = category;
  }
  if (status) {
    filter.status = status;
  }
  if (location) {
    filter.location = { $regex: escapeRegex(location), $options: 'i' };
  }
  // Animals filters — same semantics as the public search.
  if (AnimalsType) {
    filter.AnimalsType = AnimalsType;
  }
  if (gender) {
    filter.gender = gender;
  }
  if (breed) {
    filter.breed = { $regex: escapeRegex(breed), $options: 'i' };
  }
  const age = {};
  if (minAgeMonths !== undefined) age.$gte = minAgeMonths;
  if (maxAgeMonths !== undefined) age.$lte = maxAgeMonths;
  if (minAgeMonths !== undefined || maxAgeMonths !== undefined) {
    filter.ageMonths = age;
  }

  const [listings, totalResults] = await Promise.all([
    Listing.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('seller', 'name email status'),
    Listing.countDocuments(filter),
  ]);

  return { listings, pagination: buildPaginationMeta(page, limit, totalResults) };
}

/** Loads any listing by id for admin routes — no ownership requirement. */
export async function adminGetListing(id) {
  const listing = await Listing.findById(id).populate('seller', 'name email status');
  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }
  return listing;
}

export async function adminArchiveListing(listing) {
  if (listing.status === 'archived') return listing;
  listing.status = 'archived';
  await listing.save();
  return listing;
}

/**
 * Admin delete — removes the listing, its Cloudinary images, and any
 * reports filed against it (they would otherwise dangle).
 */
export async function adminDeleteListing(listing) {
  await Report.deleteMany({ listing: listing._id });
  await deleteListing(listing);
}
