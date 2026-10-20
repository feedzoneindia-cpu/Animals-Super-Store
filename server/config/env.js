import 'dotenv/config';

/**
 * Centralized, validated environment configuration.
 * Fails fast at startup when a required variable is missing so that
 * misconfigured deployments never reach a running state.
 */
const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const EXPIRY_UNITS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

function parseExpiryMs(value) {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) {
    throw new Error(`Invalid JWT_EXPIRES_IN value: "${value}" (expected e.g. "7d", "12h", "30m")`);
  }
  return Number(match[1]) * EXPIRY_UNITS[match[2]];
}

const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '7d';

const COOKIE_SAME_SITES = ['lax', 'strict', 'none'];
const cookieSameSite = (process.env.COOKIE_SAME_SITE ?? 'lax').toLowerCase();
if (!COOKIE_SAME_SITES.includes(cookieSameSite)) {
  throw new Error(
    `Invalid COOKIE_SAME_SITE value: "${cookieSameSite}" (expected one of ${COOKIE_SAME_SITES.join(', ')})`
  );
}

/**
 * Origins allowed to call the API with credentials. CLIENT_URL accepts a
 * comma-separated list so a deployment can serve both the apex domain and
 * www without a second variable, e.g.
 *   CLIENT_URL=https://yourdomain.com,https://www.yourdomain.com
 */
const clientUrl = required('CLIENT_URL');
const clientUrls = clientUrl
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
  port: Number.parseInt(process.env.PORT ?? '5000', 10),
  mongoUri: required('MONGO_URI'),
  clientUrl: clientUrls[0],
  clientUrls,
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn,
  jwtMaxAgeMs: parseExpiryMs(jwtExpiresIn),
  /**
   * SameSite policy for the auth cookie. Keep the default `lax` when the
   * frontend and API are same-site subdomains (www + api of one domain).
   * `none` is only needed when they sit on different registrable domains.
   */
  cookieSameSite,
  // Optional: without SMTP_HOST the reset link is printed to the server
  // console in development instead of being emailed.
  // SendGrid Web API (HTTPS). When SENDGRID_API_KEY is set it is used instead of SMTP.
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? '',
  // smtp: {
  //   host: process.env.SMTP_HOST ?? '',
  //   port: Number.parseInt(process.env.SMTP_PORT ?? '587', 10),
  //   secure: process.env.SMTP_SECURE === 'true',
  //   user: process.env.SMTP_USER ?? '',
  //   pass: process.env.SMTP_PASS ?? '',
  //   from: process.env.MAIL_FROM ?? process.env.SMTP_USER ?? 'no-reply@Animalssuperstore.local',
  // },
  // Optional: Vercel Deploy Hook URL of the FRONTEND project. When set, creating/updating/deleting
  // listings or blog posts triggers a rebuild so the sitemap and prerendered pages stay current.
  rebuildHookUrl: (process.env.VERCEL_DEPLOY_HOOK_URL ?? '').trim(),
  // Google Sign-In: the OAuth *Web client ID* (public). Without it /auth/google responds 503.
  googleClientId: (process.env.GOOGLE_CLIENT_ID ?? '').trim(),
  passwordResetExpiresMin: Number.parseInt(process.env.PASSWORD_RESET_EXPIRES_MIN ?? '30', 10),
  // Optional until image upload is needed — the service checks availability.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
};
