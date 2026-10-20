import cors from 'cors';
import { createApp } from '../app.js';
import { corsOptions } from '../config/cors.js';
import { connectDatabase } from '../config/db.js';

/**
 * Vercel serverless entry point.
 *
 * `api/index.js` is the single function this project deploys. server/vercel.json
 * rewrites every incoming path into it and Vercel passes the request through
 * with its original URL intact, so the Express app still sees the same paths it
 * does locally (`/api/listings`, `/api/auth/me`, `/api/blogs`, …) and
 * routes/index.js needs no Vercel-specific knowledge.
 *
 * The app is built once per instance at module scope. createApp() only wires
 * middleware and routes — it carries no per-request state — so one app is
 * reused for every invocation on a warm instance.
 *
 * server.js stays the local entry point; nothing here is used by `npm run dev`.
 */
const app = createApp();

/**
 * The same CORS policy the app uses, applied to the one response the app can
 * never produce itself (the early database-failure return below). Without it
 * the browser blocks the response for a missing Access-Control-Allow-Origin
 * header and reports a CORS error — which hides the actual 503 and sends you
 * looking in entirely the wrong place.
 */
const applyCors = cors(corsOptions);

export default async function handler(req, res) {
  try {
    // Warm instance: already connected, resolves immediately. Cold start:
    // connects once, and concurrent invocations share that one attempt.
    await connectDatabase();
  } catch (err) {
    // The real cause goes to the platform log; the client gets a safe message.
    console.error('[vercel] Database connection failed:', err.message);
    return applyCors(req, res, () => {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          success: false,
          message: 'Service temporarily unavailable. Please try again shortly.',
        })
      );
    });
  }

  // Express owns the response from here. Note there is deliberately no
  // app.listen() and no process.exit() in this file — both belong to the local
  // server lifecycle and would break the platform's request handling.
  return app(req, res);
}
