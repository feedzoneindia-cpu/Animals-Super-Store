import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import * as listingService from '../services/listing.service.js';

/**
 * Multipart bodies deliver text fields as strings. This adapter parses the
 * `existingImages` JSON payload (kept images during an edit) before zod
 * validation sees it.
 */
export const parseExistingImages = (req, res, next) => {
  if (typeof req.body.existingImages === 'string' && req.body.existingImages !== '') {
    try {
      req.body.existingImages = JSON.parse(req.body.existingImages);
    } catch {
      return next(
        ApiError.unprocessable('Validation failed', [
          { field: 'existingImages', message: 'Invalid image data' },
        ])
      );
    }
  }
  return next();
};

export const getListings = asyncHandler(async (req, res) => {
  const { listings, pagination } = await listingService.searchListings(req.validatedQuery);
  return sendSuccess(res, {
    message: 'Listings fetched successfully',
    data: { listings, pagination },
  });
});

export const getListingBySlug = asyncHandler(async (req, res) => {
  const listing = await listingService.getListingBySlug(req.params.slug);
  return sendSuccess(res, {
    message: 'Listing fetched successfully',
    data: { listing },
  });
});

export const createListing = asyncHandler(async (req, res) => {
  const listing = await listingService.createListing(req.user, req.body, req.files);
  return sendSuccess(res, {
    status: 201,
    message: 'Listing published successfully',
    data: { listing },
  });
});

export const updateListing = asyncHandler(async (req, res) => {
  const listing = await listingService.updateListing(req.listing, req.body, req.files);
  return sendSuccess(res, {
    message: 'Listing updated successfully',
    data: { listing },
  });
});

export const deleteListing = asyncHandler(async (req, res) => {
  await listingService.deleteListing(req.listing);
  return sendSuccess(res, { message: 'Listing deleted successfully' });
});

export const markListingSold = asyncHandler(async (req, res) => {
  const listing = await listingService.markListingSold(req.listing);
  return sendSuccess(res, {
    message: 'Listing marked as sold',
    data: { listing },
  });
});

export const archiveListing = asyncHandler(async (req, res) => {
  const listing = await listingService.archiveListing(req.listing);
  return sendSuccess(res, {
    message: 'Listing archived',
    data: { listing },
  });
});

export const getMyListings = asyncHandler(async (req, res) => {
  const { listings, pagination } = await listingService.getMyListings(req.user, req.validatedQuery);
  return sendSuccess(res, {
    message: 'Your listings fetched successfully',
    data: { listings, pagination },
  });
});

export const getManagedListing = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: 'Listing fetched successfully',
    data: { listing: req.listing },
  });
});
