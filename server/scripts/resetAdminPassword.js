/**
 * Reset an existing account's password.
 *
 *   node scripts/resetAdminPassword.js <email>              # prompts for the password
 *   node scripts/resetAdminPassword.js <email> <password>   # non-interactive
 *
 * Why this exists: `npm run create-admin` refuses to touch an email that is
 * already registered, and `npm run seed` would wipe users, listings, blogs and
 * reports. This script only ever updates one user's password and touches
 * nothing else — role, status and every other user are left exactly as they
 * were.
 *
 * Reuses the User model so the bcrypt pre-save hook does the hashing. The
 * plaintext is never written to the database, never echoed to the terminal,
 * and on the interactive path never passed on the command line where it would
 * land in shell history and the process list.
 */
import readline from 'node:readline';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import User from '../models/User.js';

const [email, passwordArg] = process.argv.slice(2);

if (!email) {
  console.error('Usage: node scripts/resetAdminPassword.js <email> [newPassword]');
  process.exit(1);
}

const IS_TERMINAL = Boolean(process.stdin.isTTY && process.stdout.isTTY);

/**
 * Sequential line reader, echoing nothing when `hidden`.
 *
 * Mirrors the reader in createAdmin.js. `rl.question()` cannot be used here:
 * on a piped stdin readline emits every line in one burst, and any line
 * arriving before the next question is registered is silently dropped.
 */
function makeReader() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: IS_TERMINAL,
  });

  const buffered = [];
  const waiters = [];
  let ended = false;

  rl.on('line', (line) => {
    if (waiters.length > 0) waiters.shift()(line);
    else buffered.push(line);
  });
  rl.on('close', () => {
    ended = true;
    while (waiters.length > 0) waiters.shift()(null);
  });

  const next = () => {
    if (buffered.length > 0) return Promise.resolve(buffered.shift());
    if (ended) return Promise.resolve(null);
    return new Promise((resolve) => waiters.push(resolve));
  };

  const ask = async (label, { hidden = false } = {}) => {
    process.stdout.write(label);
    const original = rl._writeToOutput;
    if (hidden) rl._writeToOutput = () => {};

    try {
      const line = await next();
      if (line === null) {
        throw new Error('Input ended before every question was answered. Nothing was changed.');
      }
      return line.trim();
    } finally {
      if (hidden) rl._writeToOutput = original;
      // A terminal echoes the newline for visible input; a muted prompt needs
      // it written explicitly.
      if (hidden || !IS_TERMINAL) process.stdout.write('\n');
    }
  };

  return { ask, close: () => rl.close() };
}

/** The password from argv, or two matched hidden prompts. */
async function readPassword() {
  if (passwordArg !== undefined) return passwordArg;

  const reader = makeReader();
  try {
    const password = await reader.ask('New password: ', { hidden: true });
    const confirmation = await reader.ask('Confirm password: ', { hidden: true });
    if (password !== confirmation) {
      throw new Error('Passwords do not match. Nothing was changed.');
    }
    return password;
  } finally {
    reader.close();
  }
}

try {
  const password = await readPassword();

  if (password.length < 8) {
    console.error('[reset-password] Password must be at least 8 characters. Nothing was changed.');
    process.exit(1);
  }

  await connectDatabase();

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    console.error(`[reset-password] No account found with email: ${email}`);
    console.error('[reset-password] Use `npm run create-admin` to create a new one.');
    process.exitCode = 1;
  } else {
    // Assigning `password` (not a hash) lets the model's pre-save hook re-hash
    // it. save() is used instead of updateOne so that hook actually runs; only
    // the password field is modified, so role and status carry over untouched.
    user.password = password;
    await user.save();

    // Re-read from the database rather than trusting the in-memory document,
    // so the confirmation below reflects what was really persisted.
    const saved = await User.findById(user._id);

    console.log(`[reset-password] Password updated for ${saved.email}`);
    console.log(`[reset-password] role: ${saved.role}   status: ${saved.status}`);
    console.log('[reset-password] Stored as a bcrypt hash — the plaintext was not saved or displayed.');
  }
} catch (error) {
  console.error(`[reset-password] ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
