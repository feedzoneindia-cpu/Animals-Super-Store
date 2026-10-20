import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId } from 'mongoose';
import * as reportService from '../services/report.service.js';

/** Loads a report referenced by :reportId for admin routes. */
export const loadReport = asyncHandler(async (req, res, next) => {
  const { reportId } = req.params;
  if (!isValidObjectId(reportId)) {
    throw ApiError.badRequest('Invalid report id');
  }
  req.report = await reportService.adminGetReport(reportId);
  return next();
});

export const createReport = asyncHandler(async (req, res) => {
  const report = await reportService.createReport(req.user, req.body);
  return sendSuccess(res, {
    status: 201,
    message: 'Report submitted successfully',
    data: { report },
  });
});

export const adminListReports = asyncHandler(async (req, res) => {
  const { reports, pagination } = await reportService.adminListReports(req.validatedQuery);
  return sendSuccess(res, {
    message: 'Reports fetched successfully',
    data: { reports, pagination },
  });
});

export const updateReportStatus = asyncHandler(async (req, res) => {
  const report = await reportService.updateReportStatus(req.report, req.body.status);
  return sendSuccess(res, {
    message: `Report marked as ${report.status}`,
    data: { report },
  });
});
