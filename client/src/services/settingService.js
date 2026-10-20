import api from './api.js';

/** Used until the live values load (and if the request fails). */
export const DEFAULT_PUBLIC_SETTINGS = {
  shippingFee: 99,
  freeShippingThreshold: 1000,
  acceptingOrders: true,
};

export const settingService = {
  getPublic: () => api.get('/settings').then((res) => res.data.data.settings),
};
