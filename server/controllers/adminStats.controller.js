import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as adminStatsService from '../services/adminStats.service.js';

export const getAdminStats = asyncHandler(async (req, res) => {
  const stats = await adminStatsService.getAdminStats();
  return sendSuccess(res, {
    message: 'Dashboard stats fetched successfully',
    data: { stats },
  });
});
