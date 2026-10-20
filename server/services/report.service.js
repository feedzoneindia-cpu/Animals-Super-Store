import Report from '../models/Report.js';
import Listing from '../models/Listing.js';
import { ApiError } from '../utils/ApiError.js';

function buildPaginationMeta(page, limit, totalResults) {
  return {
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
  };
}

/**
 * Files a report against a listing. The listing must exist and be publicly
 * visible (active or sold) — archived listings are gone from the site.
 * Reporters cannot stack duplicate open reports for the same listing.
 */
export async function createReport(user, body) {
  const listing = await Listing.findOne({
    _id: body.listing,
    status: { $in: ['active', 'sold'] },
  });
  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }

  const duplicate = await Report.exists({
    listing: listing._id,
    reporter: user._id,
    status: { $ne: 'dismissed' },
  });
  if (duplicate) {
    throw ApiError.conflict('You have already reported this listing');
  }

  return Report.create({
    listing: listing._id,
    reporter: user._id,
    reason: body.reason,
    description: body.description ?? '',
    status: 'open',
  });
}

/** Admin listing of reports, newest first, optionally filtered by status. */
export async function adminListReports(query) {
  const { status, page, limit } = query;

  const filter = {};
  if (status) {
    filter.status = status;
  }

  const [reports, totalResults] = await Promise.all([
    Report.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('listing', 'title slug status images')
      .populate('reporter', 'name email'),
    Report.countDocuments(filter),
  ]);

  return { reports, pagination: buildPaginationMeta(page, limit, totalResults) };
}

export async function updateReportStatus(report, status) {
  report.status = status;
  await report.save();
  return report;
}

/** Loads a report by id for admin routes (any status). */
export async function adminGetReport(id) {
  const report = await Report.findById(id)
    .populate('listing', 'title slug status images')
    .populate('reporter', 'name email');
  if (!report) {
    throw ApiError.notFound('Report not found');
  }
  return report;
}
