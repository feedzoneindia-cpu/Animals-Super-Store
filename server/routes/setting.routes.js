import { Router } from 'express';
import { getPublicSettings } from '../controllers/setting.controller.js';

const router = Router();

router.get('/', getPublicSettings);

export default router;
