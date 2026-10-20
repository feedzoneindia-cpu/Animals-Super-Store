import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as adminUserService from '../services/adminUser.service.js';

export const adminListUsers = asyncHandler(async (req, res) => {
  const { users, pagination } = await adminUserService.adminListUsers(req.validatedQuery);
  return sendSuccess(res, {
    message: 'Users fetched successfully',
    data: { users, pagination },
  });
});

export const blockUser = asyncHandler(async (req, res) => {
  const user = await adminUserService.blockUser(req.user, req.params.userId);
  return sendSuccess(res, {
    message: 'User blocked',
    data: { user: user.toSafeObject() },
  });
});

export const unblockUser = asyncHandler(async (req, res) => {
  const user = await adminUserService.unblockUser(req.params.userId);
  return sendSuccess(res, {
    message: 'User unblocked',
    data: { user: user.toSafeObject() },
  });
});
