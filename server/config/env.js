
import 'dotenv/config';

/**
 * Centralized, validated environment configuration.
 * Fails fast at startup when a required variable is missing.
 */
const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }
  return value;
};

const EXPIRY_UNITS = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

function parseExpiryMs(value) {
  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    throw new Error(
      `Invalid JWT_EXPIRES_IN value: "${value}" ` +
      '(expected e.g. "7d", "12h", "30m")'
    );
  }

  return Number(match[1]) * EXPIRY_UNITS[match[2]];
}

const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '7d';

const COOKIE_SAME_SITES = ['lax', 'strict', 'none'];
const cookieSameSite = (
  process.env.COOKIE_SAME_SITE ?? 'lax'
).toLowerCase();

if (!COOKIE_SAME_SITES.includes(cookieSameSite)) {
  throw new Error(
    `Invalid COOKIE_SAME_SITE value: "${cookieSameSite}" ` +
    `(expected one of ${COOKIE_SAME_SITES.join(', ')})`
  );
}

/**
 * Origins allowed to call the API with credentials.
 * CLIENT_URL accepts comma-separated origins.
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
   * Cookie SameSite policy.
   */
  cookieSameSite,

  /**
   * SendGrid Web API configuration.
   */
  sendgridApiKey: (process.env.SENDGRID_API_KEY ?? '').trim(),

  // Must be a verified sender in SendGrid.
  sendgridFrom: (
    process.env.SENDGRID_FROM ??
    process.env.MAIL_FROM ??
    ''
  ).trim(),

  /**
   * Optional Vercel deployment hook.
   */
  rebuildHookUrl: (
    process.env.VERCEL_DEPLOY_HOOK_URL ?? ''
  ).trim(),

  /**
   * Google Sign-In configuration.
   */
  googleClientId: (
    process.env.GOOGLE_CLIENT_ID ?? ''
  ).trim(),

  /**
   * Password reset link expiration in minutes.
   */
  passwordResetExpiresMin: Number.parseInt(
    process.env.PASSWORD_RESET_EXPIRES_MIN ?? '30',
    10
  ),

  /**
   * Cloudinary configuration.
   */
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },
};
