import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as orderService from '../services/order.service.js';

export const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.user, req.body);
  return sendSuccess(res, {
    status: 201,
    message: 'Order placed successfully',
    data: { order },
  });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const { orders, pagination } = await orderService.getMyOrders(req.user, req.query);
  return sendSuccess(res, {
    message: 'Orders retrieved successfully',
    data: { orders, pagination },
  });
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderByIdOrNumber(req.params.id, req.user);
  return sendSuccess(res, {
    message: 'Order fetched successfully',
    data: { order },
  });
});
