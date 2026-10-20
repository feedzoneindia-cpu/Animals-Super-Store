import { sendSuccess } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

export function getHealth(req, res) {
  return sendSuccess(res, {
    message: 'Server is healthy',
    data: {
      status: 'ok',
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
    },
  });
}
