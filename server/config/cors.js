import { env } from './env.js';

/**
 * Credentialed CORS policy, shared by the Express app and the Vercel handler.
 *
 * The browser only sends the auth cookie back when the request origin is
 * echoed here exactly — a wildcard is impossible with credentials. env.clientUrls
 * is comma-separated and covers apex + www (and preview origins) when configured.
 */
export const corsOptions = {
  origin: (origin, callback) => {
    // Same-origin/server-to-server requests send no Origin header.
    if (!origin || env.clientUrls.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
};
