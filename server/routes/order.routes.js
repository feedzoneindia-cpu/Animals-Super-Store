import { Router } from 'express';
import { createOrder, getMyOrders, getOrderById } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authenticateOptional } from '../middleware/authenticateOptional.js';

const router = Router();

// Placing an order: open to guests or signed-in users (optional auth attaches user)
router.post('/', authenticateOptional, createOrder);

// Customer order history: requires authentication
router.get('/my-orders', authenticate, getMyOrders);

// Order lookup by ID or orderNumber
router.get('/:id', authenticateOptional, getOrderById);

export default router;
