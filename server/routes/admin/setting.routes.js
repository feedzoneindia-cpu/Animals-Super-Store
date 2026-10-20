import { Router } from 'express';
import { adminGetSettings, adminUpdateSettings } from '../../controllers/setting.controller.js';
import { validate } from '../../middleware/validate.js';
import { updateSettingsSchema } from '../../validators/setting.validator.js';

const router = Router();

router.get('/', adminGetSettings);
router.put('/', validate(updateSettingsSchema), adminUpdateSettings);

export default router;
