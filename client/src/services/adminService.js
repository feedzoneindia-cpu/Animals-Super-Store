import api from './api.js';

/**
 * Admin panel API calls. The axios instance already sends the auth cookie;
 * every /admin endpoint additionally requires the ADMIN role server-side.
 */
export const adminService = {
  // Dashboard
  getStats: () => api.get('/admin/stats').then((res) => res.data.data.stats),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }).then((res) => res.data.data),
  blockUser: (id) => api.patch(`/admin/users/${id}/block`).then((res) => res.data.data.user),
  unblockUser: (id) => api.patch(`/admin/users/${id}/unblock`).then((res) => res.data.data.user),

  // Listings (filter/view/archive/delete only — no approval workflow)
  getListings: (params) => api.get('/admin/listings', { params }).then((res) => res.data.data),
  archiveListing: (id) =>
    api.patch(`/admin/listings/${id}/archive`).then((res) => res.data.data.listing),
  deleteListing: (id) => api.delete(`/admin/listings/${id}`),

  // Settings
  getSettings: () => api.get('/admin/settings').then((res) => res.data.data.settings),
  updateSettings: (values) =>
    api.put('/admin/settings', values).then((res) => res.data.data.settings),

  // Reports
  getReports: (params) => api.get('/admin/reports', { params }).then((res) => res.data.data),
  updateReportStatus: (id, status) =>
    api.patch(`/admin/reports/${id}/status`, { status }).then((res) => res.data.data.report),
};
