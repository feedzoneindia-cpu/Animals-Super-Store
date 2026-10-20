import { isValidObjectId } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import * as inquiryService from '../services/inquiry.service.js';

export const createInquiry = asyncHandler(async (req, res) => {
  const inquiry = await inquiryService.createInquiry(req.body);
  return sendSuccess(res, {
    status: 201,
    message: 'Your inquiry has been submitted successfully. We will get back to you soon!',
    data: { inquiry },
  });
});

export const listInquiries = asyncHandler(async (req, res) => {
  const { inquiries, pagination } = await inquiryService.listInquiries(req.validatedQuery || req.query);
  return sendSuccess(res, {
    message: 'Inquiries fetched successfully',
    data: { inquiries, pagination },
  });
});

export const getInquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid inquiry id');
  }

  const inquiry = await inquiryService.getInquiryById(id);
  return sendSuccess(res, {
    message: 'Inquiry fetched successfully',
    data: { inquiry },
  });
});

export const updateInquiryStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid inquiry id');
  }

  const inquiry = await inquiryService.updateInquiryStatus(id, req.body.status);
  return sendSuccess(res, {
    message: `Inquiry status updated to ${inquiry.status}`,
    data: { inquiry },
  });
});

export const deleteInquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    throw ApiError.badRequest('Invalid inquiry id');
  }

  await inquiryService.deleteInquiry(id);
  return sendSuccess(res, {
    message: 'Inquiry deleted successfully',
    data: { id },
  });
});
