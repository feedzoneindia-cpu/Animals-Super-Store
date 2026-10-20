import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { clearAuthCookie } from '../utils/cookies.js';
import * as settingService from '../services/setting.service.js';

/** Public: only the storefront-relevant values (shipping rules, order switch). */
export const getPublicSettings = asyncHandler(async (req, res) => {
  const { shippingFee, freeShippingThreshold, acceptingOrders } = await settingService.getSettings();
  return sendSuccess(res, {
    message: 'Settings fetched successfully',
    data: { settings: { shippingFee, freeShippingThreshold, acceptingOrders } },
  });
});

export const adminGetSettings = asyncHandler(async (req, res) => {
  const settings = await settingService.getSettings();
  return sendSuccess(res, { message: 'Settings fetched successfully', data: { settings } });
});

export const adminUpdateSettings = asyncHandler(async (req, res) => {
  const settings = await settingService.updateSettings(req.body);
  return sendSuccess(res, { message: 'Settings saved successfully', data: { settings } });
});

export const changePassword = asyncHandler(async (req, res) => {
  await settingService.changePassword(req.user._id, req.body);
  return sendSuccess(res, { message: 'Password updated successfully' });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  await settingService.deleteAccount(req.user._id, req.body);
  clearAuthCookie(res);
  return sendSuccess(res, { message: 'Your account has been deleted' });
});
