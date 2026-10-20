import { Router } from 'express';
import { createReport } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createReportSchema } from '../validators/report.validator.js';

const router = Router();

// Any authenticated user can report a listing. Admins review the queue in
// /api/admin/reports — there is no public report listing endpoint.
router.post('/', authenticate, validate(createReportSchema), createReport);

export default router;
