import { Router } from 'express';
import {
  createInquiry,
  listInquiries,
  getInquiry,
  updateInquiryStatus,
  deleteInquiry,
} from '../controllers/inquiry.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/authorize.js';
import { validate, validateQuery } from '../middleware/validate.js';
import {
  createInquirySchema,
  updateInquiryStatusSchema,
  listInquiriesQuerySchema,
} from '../validators/inquiry.validator.js';

const router = Router();

// Public endpoint for submitting inquiries
router.post('/', validate(createInquirySchema), createInquiry);

// Admin-only endpoints for managing inquiries
router.get('/', authenticate, requireAdmin(), validateQuery(listInquiriesQuerySchema), listInquiries);
router.get('/:id', authenticate, requireAdmin(), getInquiry);
router.patch('/:id/status', authenticate, requireAdmin(), validate(updateInquiryStatusSchema), updateInquiryStatus);
router.delete('/:id', authenticate, requireAdmin(), deleteInquiry);

export default router;
