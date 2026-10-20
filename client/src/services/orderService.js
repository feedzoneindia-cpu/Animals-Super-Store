import api from './api.js';

export const orderService = {
  async createOrder(orderData) {
    const res = await api.post('/orders', orderData);
    return res.data.data.order;
  },

  async getMyOrders(params = {}) {
    const res = await api.get('/orders/my-orders', { params });
    return res.data.data;
  },

  async getOrderById(orderId) {
    const res = await api.get(`/orders/${orderId}`);
    return res.data.data.order;
  },

  // Admin APIs
  async adminListOrders(params = {}) {
    const res = await api.get('/admin/orders', { params });
    return res.data.data;
  },

  async adminGetOrder(orderId) {
    const res = await api.get(`/admin/orders/${orderId}`);
    return res.data.data.order;
  },

  async adminUpdateOrderStatus(orderId, updateData) {
    const res = await api.patch(`/admin/orders/${orderId}/status`, updateData);
    return res.data.data.order;
  },
};
