/**
 * Wraps async route handlers so rejected promises are forwarded to the
 * centralized error handler instead of crashing the process.
 */
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
