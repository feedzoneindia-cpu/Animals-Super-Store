import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId } from 'mongoose';
import * as adminListingService from '../services/adminListing.service.js';

/** Loads a listing referenced by :listingId for admin routes. */
export const loadAdminListing = asyncHandler(async (req, res, next) => {
  const { listingId } = req.params;
  if (!isValidObjectId(listingId)) {
    throw ApiError.badRequest('Invalid listing id');
  }
  req.listing = await adminListingService.adminGetListing(listingId);
  return next();
});

export const adminListListings = asyncHandler(async (req, res) => {
  const { listings, pagination } = await adminListingService.adminSearchListings(req.validatedQuery);
  return sendSuccess(res, {
    message: 'Listings fetched successfully',
    data: { listings, pagination },
  });
});

export const adminArchiveListing = asyncHandler(async (req, res) => {
  const listing = await adminListingService.adminArchiveListing(req.listing);
  return sendSuccess(res, {
    message: 'Listing archived',
    data: { listing },
  });
});

export const adminDeleteListing = asyncHandler(async (req, res) => {
  await adminListingService.adminDeleteListing(req.listing);
  return sendSuccess(res, { message: 'Listing deleted successfully' });
});
