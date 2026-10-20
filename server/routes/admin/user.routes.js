import { Router } from 'express';
import { adminListUsers, blockUser, unblockUser } from '../../controllers/adminUser.controller.js';
import { validateQuery } from '../../middleware/validate.js';
import { adminListUsersQuerySchema } from '../../validators/report.validator.js';

const router = Router();

router.get('/', validateQuery(adminListUsersQuerySchema), adminListUsers);
router.patch('/:userId/block', blockUser);
router.patch('/:userId/unblock', unblockUser);

// NOTE: there are intentionally no role-change endpoints — roles are
// managed directly in the database, so no privilege escalation is
// possible through the API.
export default router;
