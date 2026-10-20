import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import LoginAttempt from '../models/LoginAttempt.js';
import { env } from '../config/env.js';
import { sendPasswordResetEmail } from './email.service.js';
import { ApiError } from '../utils/ApiError.js';

export async function registerUser({ name, email, password, phone }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }
  return User.create({ name, email, password, phone: phone ?? '' });
}

// Brute-force protection (per email, so other users are never affected).
//  - 5 wrong passwords  -> locked for 30 seconds
//  - 5 more after that  -> locked for 2 minutes (and 2 minutes for every lock after)
// The escalation level is forgotten after an hour without failed attempts.
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_SECONDS = [30, 120];
const STATE_TTL_MS = 60 * 60 * 1000;

function lockedError(secondsLeft) {
  const retryAfter = Math.max(1, Math.ceil(secondsLeft));
  const error = new ApiError(429, 'Too many attempts. Please try again later.');
  error.meta = { code: 'ACCOUNT_LOCKED', retryAfter };
  return error;
}

async function recordFailedLogin(email) {
  const attempt = await LoginAttempt.findOneAndUpdate(
    { email },
    {
      $inc: { failures: 1 },
      $set: { expiresAt: new Date(Date.now() + STATE_TTL_MS) },
      $setOnInsert: { level: 0 },
    },
    { upsert: true, new: true }
  );

  if (attempt.failures < MAX_FAILED_ATTEMPTS) {
    return { attemptsLeft: MAX_FAILED_ATTEMPTS - attempt.failures };
  }

  // Threshold reached: start a lock. The failures filter makes sure only one of
  // several simultaneous requests escalates the level.
  const nextLevel = attempt.level + 1;
  const seconds = LOCK_SECONDS[Math.min(nextLevel, LOCK_SECONDS.length) - 1];
  const lockUntil = new Date(Date.now() + seconds * 1000);
  const locked = await LoginAttempt.findOneAndUpdate(
    { email, failures: { $gte: MAX_FAILED_ATTEMPTS } },
    {
      $set: { failures: 0, lockUntil, expiresAt: new Date(lockUntil.getTime() + STATE_TTL_MS) },
      $inc: { level: 1 },
    },
    { new: true }
  );
  if (locked) throw lockedError(seconds);

  const current = await LoginAttempt.findOne({ email });
  throw lockedError(current?.lockUntil ? (current.lockUntil.getTime() - Date.now()) / 1000 : seconds);
}

export async function loginUser({ email, password }) {
  // Identical error for unknown email and wrong password — never reveal which.
  const invalid = (attemptsLeft) =>
    ApiError.unauthorized(
      attemptsLeft != null && attemptsLeft <= 2
        ? `Invalid email or password. ${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} left before a temporary lock.`
        : 'Invalid email or password'
    );

  // A locked email is refused before the password is even checked, so a
  // correct guess during the lock does not get through.
  const attempt = await LoginAttempt.findOne({ email });
  if (attempt?.lockUntil && attempt.lockUntil.getTime() > Date.now()) {
    throw lockedError((attempt.lockUntil.getTime() - Date.now()) / 1000);
  }

  const user = await User.findOne({ email }).select('+password');
  const passwordMatches = user ? await user.comparePassword(password) : false;
  if (!passwordMatches) {
    const { attemptsLeft } = await recordFailedLogin(email);
    throw invalid(attemptsLeft);
  }

  if (user.status === 'blocked') {
    throw ApiError.forbidden('Your account has been blocked. Please contact support.');
  }

  if (attempt) await LoginAttempt.deleteOne({ email });
  return user;
}

export async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('Account no longer exists');
  }
  return user;
}

export async function updateProfile(userId, { name, phone }) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('Account no longer exists');
  }
  user.name = name;
  if (phone !== undefined) {
    user.phone = phone;
  }
  await user.save();
  return user;
}

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Starts a password reset. The link is only sent when the email belongs to a
 * registered account; otherwise an error is returned to the caller.
 */
export async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) {
    throw ApiError.notFound('No account is registered with this email address.');
  }
  if (user.status === 'blocked') {
    throw ApiError.forbidden('Your account has been blocked. Please contact support.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = hashToken(token);
  user.passwordResetExpires = new Date(Date.now() + env.passwordResetExpiresMin * 60_000);
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${env.clientUrl}/reset-password/${token}`;
  try {
    await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
  } catch (err) {
    // Roll the token back, log the real cause, and tell the user to retry.
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.error('Failed to send password reset email:', err.message);
    throw new ApiError(502, 'We could not send the reset email right now. Please try again later.');
  }
}

export async function resetPassword({ token, password }) {
  const user = await User.findOne({
    passwordResetToken: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw ApiError.badRequest('This reset link is invalid or has expired. Please request a new one.');
  }

  user.password = password; // hashed by the pre-save hook
  user.passwordResetToken = undefined; // single use
  user.passwordResetExpires = undefined;
  await user.save();
}

let googleClient;

/**
 * Google Sign-In. The browser sends the ID token (a signed JWT) it got from
 * Google; it is verified here against our client ID — nothing the client says
 * about the user is trusted. A matching existing account (same verified email)
 * is linked rather than duplicated.
 */
export async function loginWithGoogle(idToken) {
  if (!env.googleClientId) {
    throw new ApiError(503, 'Google sign-in is not configured on the server.');
  }
  googleClient ??= new OAuth2Client(env.googleClientId);

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized('Google sign-in failed. Please try again.');
  }
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw ApiError.unauthorized('Your Google email address is not verified.');
  }

  const email = payload.email.toLowerCase();
  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });

  if (user) {
    if (user.status === 'blocked') {
      throw ApiError.forbidden('Your account has been blocked. Please contact support.');
    }
    let changed = false;
    if (!user.googleId) {
      user.googleId = payload.sub;
      changed = true;
    }
    if (!user.avatar?.url && payload.picture) {
      user.avatar = { url: payload.picture, publicId: '' };
      changed = true;
    }
    if (changed) await user.save({ validateBeforeSave: false });
    return user;
  }

  let name = (payload.name || email.split('@')[0]).trim().slice(0, 50);
  if (name.length < 2) name = 'User';
  return User.create({
    name,
    email,
    googleId: payload.sub,
    avatar: { url: payload.picture ?? '', publicId: '' },
  });
}
