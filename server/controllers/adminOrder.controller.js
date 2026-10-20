import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import * as orderService from '../services/order.service.js';

export const adminListOrders = asyncHandler(async (req, res) => {
  const { orders, pagination } = await orderService.adminListOrders(req.query);
  return sendSuccess(res, {
    message: 'Orders retrieved successfully',
    data: { orders, pagination },
  });
});

export const adminGetOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderByIdOrNumber(req.params.id, req.user);
  return sendSuccess(res, {
    message: 'Order retrieved successfully',
    data: { order },
  });
});

export const adminUpdateOrderStatus = asyncHandler(async (req, res) => {
  const order = await orderService.adminUpdateOrderStatus(req.params.id, req.body);
  return sendSuccess(res, {
    message: 'Order status updated successfully',
    data: { order },
  });
});
