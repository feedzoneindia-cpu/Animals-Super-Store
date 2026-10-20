import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { signAccessToken } from '../utils/jwt.js';
import { attachAuthCookie, clearAuthCookie } from '../utils/cookies.js';
import * as authService from '../services/auth.service.js';

function startSession(res, user) {
  const token = signAccessToken({ id: user._id.toString(), role: user.role });
  attachAuthCookie(res, token);
}

export const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.body);
  startSession(res, user);
  return sendSuccess(res, {
    status: 201,
    message: 'Account created successfully',
    data: { user: user.toSafeObject() },
  });
});

export const login = asyncHandler(async (req, res) => {
  const user = await authService.loginUser(req.body);
  startSession(res, user);
  return sendSuccess(res, {
    message: 'Logged in successfully',
    data: { user: user.toSafeObject() },
  });
});

export const googleLogin = asyncHandler(async (req, res) => {
  const user = await authService.loginWithGoogle(req.body.credential);
  startSession(res, user);
  return sendSuccess(res, {
    message: 'Logged in with Google',
    data: { user: user.toSafeObject() },
  });
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  return sendSuccess(res, { message: 'Logged out successfully' });
});

export const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    message: 'Profile fetched successfully',
    data: { user: req.user.toSafeObject() },
  });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);
  return sendSuccess(res, {
    message: 'Profile updated successfully',
    data: { user: user.toSafeObject() },
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  return sendSuccess(res, { message: 'A password reset link has been sent to your email.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  return sendSuccess(res, { message: 'Password updated successfully. You can now log in.' });
});
