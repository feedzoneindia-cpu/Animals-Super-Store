import Inquiry from '../models/Inquiry.js';
import { ApiError } from '../utils/ApiError.js';

function buildPaginationMeta(page, limit, totalResults) {
  return {
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.max(1, Math.ceil(totalResults / limit)),
    totalResults,
  };
}

/**
 * Creates a new public inquiry. Status is guaranteed to default to 'new'.
 */
export async function createInquiry({ name, email, phone, subject, message }) {
  return Inquiry.create({
    name,
    email,
    phone: phone || '',
    subject,
    message,
    status: 'new',
  });
}

/**
 * Lists inquiries with pagination, status filter, and keyword search.
 */
export async function listInquiries({ status, q, page = 1, limit = 10 } = {}) {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (q) {
    const trimmed = q.trim();
    filter.$or = [
      { name: { $regex: trimmed, $options: 'i' } },
      { email: { $regex: trimmed, $options: 'i' } },
      { subject: { $regex: trimmed, $options: 'i' } },
    ];
  }

  const [inquiries, totalResults] = await Promise.all([
    Inquiry.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit),
    Inquiry.countDocuments(filter),
  ]);

  return {
    inquiries,
    pagination: buildPaginationMeta(page, limit, totalResults),
  };
}

/**
 * Loads a single inquiry by ID.
 */
export async function getInquiryById(id) {
  const inquiry = await Inquiry.findById(id);
  if (!inquiry) {
    throw ApiError.notFound('Inquiry not found');
  }
  return inquiry;
}

/**
 * Updates an inquiry's status ('new', 'read', 'resolved').
 */
export async function updateInquiryStatus(id, status) {
  const inquiry = await Inquiry.findById(id);
  if (!inquiry) {
    throw ApiError.notFound('Inquiry not found');
  }

  inquiry.status = status;
  await inquiry.save();
  return inquiry;
}

/**
 * Deletes an inquiry.
 */
export async function deleteInquiry(id) {
  const inquiry = await Inquiry.findById(id);
  if (!inquiry) {
    throw ApiError.notFound('Inquiry not found');
  }

  await inquiry.deleteOne();
  return { id };
}
