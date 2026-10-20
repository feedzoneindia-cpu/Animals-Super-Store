import Setting, { SETTINGS_KEY, SETTING_DEFAULTS } from '../models/Setting.js';
import User from '../models/User.js';
import Listing from '../models/Listing.js';
import Blog from '../models/Blog.js';
import Order from '../models/Order.js';
import Report from '../models/Report.js';
import { ApiError } from '../utils/ApiError.js';

const PUBLIC_FIELDS = ['shippingFee', 'freeShippingThreshold', 'acceptingOrders'];

const pick = (doc) => Object.fromEntries(PUBLIC_FIELDS.map((field) => [field, doc[field]]));

/** Returns the settings singleton, creating it with defaults on first use. */
export async function getSettings() {
  const doc = await Setting.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY, ...SETTING_DEFAULTS } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  return { ...pick(doc), updatedAt: doc.updatedAt };
}

export async function updateSettings(values) {
  const doc = await Setting.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: values, $setOnInsert: { key: SETTINGS_KEY } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  ).lean();
  return { ...pick(doc), updatedAt: doc.updatedAt };
}

/** Shipping rule shared by checkout and the cart: free above the threshold. */
export function calculateShippingFee(settings, subtotal) {
  return subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
}

/** Lets any signed-in user change their own password. */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (!user.password) {
    throw ApiError.badRequest('This account signs in with Google and has no password to change');
  }
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  if (currentPassword === newPassword) {
    throw ApiError.badRequest('New password must be different from the current password');
  }
  user.password = newPassword; // hashed by the User pre-save hook
  await user.save();
}

/**
 * Permanently deletes the signed-in user's own account (customer or admin).
 * Admins only:
 * - The last remaining admin can't be deleted (the panel would be unreachable).
 * - Their listings and blog posts are handed to another admin so nothing
 *   on the storefront is left pointing at a missing user.
 * Everyone: orders are kept (detached from the user) and their reports removed.
 */
export async function deleteAccount(userId, { password }) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.unauthorized('Account no longer exists');

  if (user.password) {
    if (!password || !(await user.comparePassword(password))) {
      throw ApiError.badRequest('Password is incorrect');
    }
  }

  if (user.role === 'ADMIN') {
    const successor = await User.findOne({
      role: 'ADMIN',
      status: 'active',
      _id: { $ne: user._id },
    }).select('_id');
    if (!successor) {
      throw ApiError.badRequest(
        'You are the only admin. Create or promote another admin before deleting this account.'
      );
    }
    await Promise.all([
      Listing.updateMany({ seller: user._id }, { $set: { seller: successor._id } }),
      Blog.updateMany({ author: user._id }, { $set: { author: successor._id } }),
    ]);
  }

  await Promise.all([
    Order.updateMany({ user: user._id }, { $set: { user: null } }),
    Report.deleteMany({ reporter: user._id }),
  ]);
  await user.deleteOne();
}
