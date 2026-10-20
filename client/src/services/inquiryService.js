import api from './api.js';

export const inquiryService = {
  // Public submission
  submitInquiry: (data) => api.post('/inquiries', data).then((res) => res.data),

  // Admin management
  getInquiries: (params) => api.get('/inquiries', { params }).then((res) => res.data.data),
  getInquiryById: (id) => api.get(`/inquiries/${id}`).then((res) => res.data.data.inquiry),
  updateInquiryStatus: (id, status) =>
    api.patch(`/inquiries/${id}/status`, { status }).then((res) => res.data.data.inquiry),
  deleteInquiry: (id) => api.delete(`/inquiries/${id}`).then((res) => res.data),
};
