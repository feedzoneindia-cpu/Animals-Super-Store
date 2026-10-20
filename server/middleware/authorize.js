import { ApiError } from '../utils/ApiError.js';

/**
 * Role-based authorization. Must run after `authenticate`.
 * Usage: requireRole('ADMIN') or requireRole('USER', 'ADMIN')
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden());
  }
  return next();
};

export const requireAdmin = () => requireRole('ADMIN');
