import { isValidObjectId } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import Listing from '../models/Listing.js';

/**
 * Loads a listing by id for listing management (edit / sold / archive /
 * delete) and attaches it to req.listing.
 *
 * Must run after `authenticate` AND `requireAdmin` — listing management is
 * admin-only, so there is no per-owner check any more: an admin manages any
 * listing. The role gate lives in the route chain, never in the request body.
 */
export const loadManagedListing = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid listing id');
  }

  const listing = await Listing.findById(id);
  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }

  req.listing = listing;
  return next();
});
