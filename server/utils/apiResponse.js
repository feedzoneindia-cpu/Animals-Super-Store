/**
 * Consistent success response envelope:
 * { success: true, message, data, meta? }
 */
export function sendSuccess(res, { status = 200, message = 'Success', data = null, meta } = {}) {
  const body = { success: true, message, data };
  if (meta !== undefined) {
    body.meta = meta;
  }
  return res.status(status).json(body);
}
