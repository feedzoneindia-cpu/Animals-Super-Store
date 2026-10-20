import { asyncHandler } from '../utils/asyncHandler.js';
import { AUTH_COOKIE } from '../utils/cookies.js';
import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';

/**
 * Optional authentication: if an auth cookie exists and is valid, attaches
 * the active user to req.user. Does NOT fail or reject if no token is present.
 */
export const authenticateOptional = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.id);
    if (user && user.status !== 'blocked') {
      req.user = user;
    }
  } catch {
    // Ignore invalid/expired cookie for optional routes
  }

  return next();
});
