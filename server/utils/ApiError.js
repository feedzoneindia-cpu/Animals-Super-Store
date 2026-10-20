/**
 * Application error with an HTTP status code and optional field errors.
 * All operational errors should be expressed as ApiError instances so the
 * centralized error handler can format a consistent response.
 */
export class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }

  static badRequest(message = 'Bad request', errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Not authenticated', errors = []) {
    return new ApiError(401, message, errors);
  }

  static forbidden(message = 'You do not have permission to perform this action', errors = []) {
    return new ApiError(403, message, errors);
  }

  static notFound(message = 'Resource not found', errors = []) {
    return new ApiError(404, message, errors);
  }

  static conflict(message = 'Resource already exists', errors = []) {
    return new ApiError(409, message, errors);
  }

  static unprocessable(message = 'Validation failed', errors = []) {
    return new ApiError(422, message, errors);
  }
}
