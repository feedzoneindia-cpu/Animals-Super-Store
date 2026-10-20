import api from './api.js';

/** Auth API calls — components always go through this service, never axios directly. */
export const authService = {
  register: (payload) => api.post('/auth/register', payload).then((res) => res.data.data.user),
  login: (payload) => api.post('/auth/login', payload).then((res) => res.data.data.user),
  googleLogin: (credential) => api.post('/auth/google', { credential }).then((res) => res.data.data.user),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me').then((res) => res.data.data.user),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((res) => res.data.message),
  resetPassword: (token, password) =>
    api.post('/auth/reset-password', { token, password }).then((res) => res.data.message),
  updateProfile: (payload) => api.put('/users/me', payload).then((res) => res.data.data.user),
  changePassword: (payload) => api.put('/users/me/password', payload),
  deleteAccount: (password) => api.delete('/users/me', { data: { password } }),
};
