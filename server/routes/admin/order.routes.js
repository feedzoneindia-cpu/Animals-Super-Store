import { Router } from 'express';
import {
  adminListOrders,
  adminGetOrder,
  adminUpdateOrderStatus,
} from '../../controllers/adminOrder.controller.js';

const router = Router();

router.get('/', adminListOrders);
router.get('/:id', adminGetOrder);
router.patch('/:id/status', adminUpdateOrderStatus);

export default router;
