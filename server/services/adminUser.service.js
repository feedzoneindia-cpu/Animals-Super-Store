import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/slug.js';

function buildPaginationMeta(page, limit, totalResults) {
  return {
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
  };
}

/** Admin listing of users — safe objects only, no password ever leaks. */
export async function adminListUsers(query) {
  const { q, role, status, page, limit } = query;

  const filter = {};
  if (q) {
    filter.$or = [
      { name: { $regex: escapeRegex(q), $options: 'i' } },
      { email: { $regex: escapeRegex(q), $options: 'i' } },
    ];
  }
  if (role) {
    filter.role = role;
  }
  if (status) {
    filter.status = status;
  }

  const [users, totalResults] = await Promise.all([
    User.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);

  return { users: users.map((user) => user.toSafeObject()), pagination: buildPaginationMeta(page, limit, totalResults) };
}

/**
 * Blocks an account. Blocked users are locked out immediately — the
 * authenticate middleware checks the status on every request.
 * Guards: you cannot block yourself, and the last remaining active admin
 * can never be blocked (they would be unable to undo it).
 */
export async function blockUser(admin, userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  if (user._id.equals(admin._id)) {
    throw ApiError.badRequest('You cannot block your own account');
  }
  if (user.role === 'ADMIN') {
    const activeAdmins = await User.countDocuments({ role: 'ADMIN', status: 'active' });
    if (activeAdmins <= 1) {
      throw ApiError.forbidden('The last remaining admin account cannot be blocked');
    }
  }
  if (user.status === 'blocked') return user;

  user.status = 'blocked';
  await user.save();
  return user;
}

export async function unblockUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  if (user.status === 'active') return user;

  user.status = 'active';
  await user.save();
  return user;
}
