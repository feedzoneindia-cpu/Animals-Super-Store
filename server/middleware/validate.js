import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

const emptyToUndefined = (value) => (value === '' || value === null ? undefined : value);

const preprocessEmpty = (schema) => z.preprocess(emptyToUndefined, schema.optional());

/**
 * Validates req.body against a zod schema. On success the parsed value
 * replaces req.body; on failure a 422 with field-level errors is passed on.
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return next(ApiError.unprocessable('Validation failed', formatIssues(result.error)));
  }
  req.body = result.data;
  return next();
};

/**
 * Validates req.query the same way. Empty-string params (common when forms
 * submit unfiltered selects) are treated as absent.
 */
export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return next(ApiError.unprocessable('Invalid query parameters', formatIssues(result.error)));
  }
  req.validatedQuery = result.data;
  return next();
};

function formatIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

export { preprocessEmpty };
