import { Router } from 'express';
import {
  adminListReports,
  updateReportStatus,
  loadReport,
} from '../../controllers/report.controller.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import {
  adminListReportsQuerySchema,
  updateReportStatusSchema,
} from '../../validators/report.validator.js';

const router = Router();

router.get('/', validateQuery(adminListReportsQuerySchema), adminListReports);
router.patch('/:reportId/status', loadReport, validate(updateReportStatusSchema), updateReportStatus);

export default router;
