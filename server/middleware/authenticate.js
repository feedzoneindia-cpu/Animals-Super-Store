import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AUTH_COOKIE } from '../utils/cookies.js';
import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';

/**
 * Verifies the auth cookie, loads the user, and rejects blocked accounts.
 * Attaches the authenticated user document to req.user.
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) {
    throw ApiError.unauthorized('Authentication required');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Your session is invalid or has expired. Please log in again.');
  }

  const user = await User.findById(payload.id);
  if (!user) {
    throw ApiError.unauthorized('Account no longer exists');
  }
  if (user.status === 'blocked') {
    throw ApiError.forbidden('Your account has been blocked. Please contact support.');
  }

  req.user = user;
  return next();
});

/**
 * `/auth/me` is a session probe, and a visitor who presents no cookie at all
 * is an expected state rather than an application error. Answering with
 * 200 + `user: null` stops the browser logging a failed request on every
 * public page load, where the probe is only ever asking "is anyone signed in?".
 *
 * Nothing is relaxed for a session that actually exists: any request carrying
 * a cookie still passes through `authenticate` above, so invalid, expired,
 * revoked and blocked sessions are rejected with 401/403 exactly as before.
 */
export const anonymousWhenNoCookie = (req, res, next) => {
  if (req.cookies?.[AUTH_COOKIE]) {
    return next();
  }
  return sendSuccess(res, { message: 'No active session', data: { user: null } });
};
