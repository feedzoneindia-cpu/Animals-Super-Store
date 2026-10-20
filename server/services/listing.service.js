import {
    Animals_CATEGORY,
    LISTING_SORT_MAP,
    MAX_LISTING_IMAGES,
    PUBLICLY_VISIBLE_STATUSES,
} from '../constants/listings.js';
import Listing from '../models/Listing.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex, generateUniqueSlug, slugify } from '../utils/slug.js';
import { destroyImages, uploadImage } from './cloudinary.service.js';

/**
 * Animals fields are read off the body only for the Animalss category; product
 * listings never carry them, so switching a listing back to a product category
 * clears whatever Animals data it had.
 */
function AnimalsFieldsFrom(body) {
  if (body.category !== Animals_CATEGORY) {
    return { AnimalsType: undefined, breed: undefined, ageMonths: undefined, gender: undefined };
  }
  return {
    AnimalsType: body.AnimalsType,
    breed: body.breed,
    ageMonths: body.ageMonths,
    gender: body.gender,
  };
}

function buildPaginationMeta(page, limit, totalResults) {
  return {
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
  };
}

async function paginate(query, filter, sortString) {
  const { page, limit } = query;
  const [listings, totalResults] = await Promise.all([
    Listing.find(filter)
      .sort(sortString)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('seller', 'name createdAt'),
    Listing.countDocuments(filter),
  ]);
  return { listings, pagination: buildPaginationMeta(page, limit, totalResults) };
}

/**
 * Public search. Only active listings appear in results — sold listings stay
 * reachable through their detail page, archived listings are invisible.
 */
export async function searchListings(query) {
  const {
    q,
    category,
    location,
    minPrice,
    maxPrice,
    AnimalsType,
    gender,
    breed,
    minAgeMonths,
    maxAgeMonths,
    sort,
    page,
    limit,
  } = query;

  const filter = { status: 'active' };
  if (q) {
    filter.title = { $regex: escapeRegex(q), $options: 'i' };
  }
  if (category) {
    filter.category = category;
  }
  if (location) {
    filter.location = { $regex: escapeRegex(location), $options: 'i' };
  }
  const price = {};
  if (minPrice !== undefined) price.$gte = minPrice;
  if (maxPrice !== undefined) price.$lte = maxPrice;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = price;
  }

  // Animals filters. These only ever match listings in the Animalss category,
  // so existing product searches are unaffected.
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

  return paginate(query, filter, LISTING_SORT_MAP[sort]);
}

/** Public detail view — sold listings stay accessible, archived ones do not. */
export async function getListingBySlug(slug) {
  const listing = await Listing.findOne({ slug, status: { $in: PUBLICLY_VISIBLE_STATUSES } }).populate(
    'seller',
    'name createdAt'
  );
  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }

  // Count the view without blocking the response data.
  await Listing.updateOne({ _id: listing._id }, { $inc: { views: 1 } });

  return { ...listing.toObject(), views: listing.views + 1 };
}

export async function getMyListings(user, query) {
  const filter = { seller: user._id };
  if (query.status) {
    filter.status = query.status;
  }
  return paginate(query, filter, LISTING_SORT_MAP[query.sort]);
}

/**
 * Creates a listing that is PUBLIC IMMEDIATELY — status defaults to active
 * and no approval step exists anywhere in this flow.
 */
export async function createListing(user, body, imageFiles) {
  const finalImages = await uploadImages(imageFiles, user._id.toString());
  if (finalImages.length === 0) {
    throw ApiError.unprocessable('At least one image is required', [
      { field: 'images', message: 'Please add at least one image' },
    ]);
  }

  const slug = await generateUniqueSlug(slugify(body.title), Listing);

  const stockQuantity =
    body.category === Animals_CATEGORY
      ? 0
      : body.stockQuantity !== undefined
      ? Number(body.stockQuantity)
      : 10;

  return Listing.create({
    title: body.title,
    slug,
    category: body.category,
    description: body.description,
    price: body.price,
    stockQuantity,
    location: body.location,
    images: finalImages,
    seller: user._id,
    sellerName: body.sellerName,
    contactNumber: body.contactNumber,
    contactEmail: body.contactEmail ?? '',
    additionalDetails: body.additionalDetails ?? '',
    ...AnimalsFieldsFrom(body),
    status: 'active',
  });
}

export async function updateListing(listing, body, imageFiles) {
  // Only images that actually belong to this listing may be kept — a client
  // cannot attach arbitrary external URLs.
  const keptImages = (body.existingImages ?? []).filter((image) =>
    listing.images.some((existing) => existing.url === image.url)
  );

  const newImages = await uploadImages(imageFiles, listing.seller.toString(), keptImages.length);

  if (keptImages.length + newImages.length === 0) {
    throw ApiError.unprocessable('At least one image is required', [
      { field: 'images', message: 'Please keep or add at least one image' },
    ]);
  }

  // Clean up Cloudinary assets that were removed in this edit.
  const removedImages = listing.images.filter(
    (existing) => !keptImages.some((kept) => kept.url === existing.url)
  );
  await destroyImages(removedImages);

  // The slug stays stable across title changes — links never break.
  listing.title = body.title;
  listing.category = body.category;
  listing.description = body.description;
  listing.price = body.price;
  if (body.category === Animals_CATEGORY) {
    listing.stockQuantity = 0;
  } else if (body.stockQuantity !== undefined) {
    listing.stockQuantity = Number(body.stockQuantity);
  }
  listing.location = body.location;
  listing.images = [...keptImages, ...newImages];
  listing.sellerName = body.sellerName;
  listing.contactNumber = body.contactNumber;
  listing.contactEmail = body.contactEmail ?? '';
  listing.additionalDetails = body.additionalDetails ?? '';
  Object.assign(listing, AnimalsFieldsFrom(body));

  await listing.save();
  return listing;
}

export async function deleteListing(listing) {
  await destroyImages(listing.images);
  await listing.deleteOne();
}

export async function markListingSold(listing) {
  if (listing.status === 'sold') return listing;
  if (listing.status !== 'active') {
    throw ApiError.conflict('Only active listings can be marked as sold');
  }
  listing.status = 'sold';
  await listing.save();
  return listing;
}

export async function archiveListing(listing) {
  if (listing.status === 'archived') return listing;
  listing.status = 'archived';
  await listing.save();
  return listing;
}

/** Uploads each validated file, enforcing the total image limit. */
async function uploadImages(imageFiles, folder, reservedCount = 0) {
  const files = imageFiles ?? [];
  if (files.length === 0) return [];
  if (reservedCount + files.length > MAX_LISTING_IMAGES) {
    throw ApiError.unprocessable(`A listing can have at most ${MAX_LISTING_IMAGES} images`);
  }
  return Promise.all(files.map((file) => uploadImage(file.buffer, `Animals-super-store/listings/${folder}`)));
}
