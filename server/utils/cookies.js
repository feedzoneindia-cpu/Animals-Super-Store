import { env } from '../config/env.js';

export const AUTH_COOKIE = 'ass_token';

/**
 * Cookie options for the auth JWT.
 *
 * Deployment topology matters here. The supported production layout is
 * same-site subdomains:
 *
 *   frontend  https://www.yourdomain.com
 *   backend   https://api.yourdomain.com
 *
 * Subdomains of one registrable domain are *same-site*, so `SameSite=Lax`
 * works and the cookie is sent on the cross-origin XHR the SPA makes. If the
 * frontend and API ever live on different registrable domains (e.g. Vercel +
 * a separate onrender.com host), Lax cookies are NOT sent on those requests
 * and login will silently fail — in that case set COOKIE_SAME_SITE=none
 * (which requires HTTPS, hence `secure`).
 */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction || env.cookieSameSite === 'none',
    sameSite: env.cookieSameSite,
    path: '/',
  };
}

export function attachAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, {
    ...cookieOptions(),
    maxAge: env.jwtMaxAgeMs,
  });
}

export function clearAuthCookie(res) {
  // Same attributes as when it was set, otherwise browsers keep the old cookie.
  res.clearCookie(AUTH_COOKIE, cookieOptions());
}
