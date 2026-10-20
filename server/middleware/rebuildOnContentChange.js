import { env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const MIN_GAP_MS = 30_000;
let lastTriggeredAt = 0;

/** Asks Vercel to rebuild the frontend. Never throws; gives up after 3s so the API response is not held up. */
async function triggerRebuild() {
  const now = Date.now();
  if (now - lastTriggeredAt < MIN_GAP_MS) return; // the daily scheduled rebuild covers anything skipped here
  lastTriggeredAt = now;
  try {
    const res = await fetch(env.rebuildHookUrl, { method: 'POST', signal: AbortSignal.timeout(3000) });
    if (!res.ok) console.warn(`[seo] deploy hook responded ${res.status}`);
  } catch (err) {
    console.warn(`[seo] deploy hook failed: ${err.message}`);
  }
}

/**
 * Mount in front of routes that change public content (listings, blog posts).
 * After a SUCCESSFUL write the frontend is rebuilt, so new/changed products and posts
 * reach sitemap.xml and the prerendered pages without anyone redeploying by hand.
 * The hook is awaited before the response is flushed because serverless functions
 * may be frozen the moment the response ends.
 */
export function rebuildOnContentChange(req, res, next) {
  if (!env.rebuildHookUrl || SAFE_METHODS.has(req.method)) return next();
  const end = res.end.bind(res);
  res.end = (...args) => {
    if (res.statusCode >= 400) return end(...args);
    triggerRebuild().finally(() => end(...args));
    return res;
  };
  return next();
}
