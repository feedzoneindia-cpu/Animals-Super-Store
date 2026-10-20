import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Centralized error handler. Translates known error types (ApiError,
 * Mongoose validation/cast/duplicate-key) into consistent JSON responses
 * and never leaks stack traces or internals in production.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let error = err;

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    error = ApiError.unprocessable('Validation failed', errors);
  } else if (err instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid value for "${err.path}"`);
  } else if (err.code === 11000) {
    const [field] = Object.keys(err.keyValue ?? {});
    error = ApiError.conflict(`A record with this ${field ?? 'value'} already exists`);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Your session is invalid or has expired. Please log in again.');
  } else if (err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: 'Each image must be 5 MB or smaller',
      LIMIT_FILE_COUNT: 'A listing can have at most 5 images',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field in upload',
    };
    error = ApiError.unprocessable(messages[err.code] ?? `Upload error: ${err.code}`);
  }

  if (!error.statusCode) {
    console.error('[error] Unexpected error:', err);
    error = new ApiError(500, 'Internal server error');
  } else if (env.isDevelopment) {
    console.error(`[error] ${error.statusCode}: ${error.message}`);
  }

  if (error.meta?.retryAfter) res.set('Retry-After', String(error.meta.retryAfter));

  return res.status(error.statusCode).json({
    success: false,
    // Unexpected 500s never leak internals; deliberate 5xx ApiErrors
    // (e.g. "uploads not configured") carry a client-safe message.
    message: error.statusCode === 500 ? 'Internal server error' : error.message,
    ...(error.meta ?? {}),
    ...(Array.isArray(error.errors) && error.errors.length > 0 ? { errors: error.errors } : {}),
  });
}
