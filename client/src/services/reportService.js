import api from './api.js';

/** Report API calls — any authenticated user can report a listing. */
export const reportService = {
  createReport: (payload) => api.post('/reports', payload).then((res) => res.data),
};
