import api from './api';

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }).then(r => r.data),
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
  getMe: () => api.get('/auth/me').then(r => r.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then(r => r.data),
  resetPassword: (data) => api.post('/auth/reset-password', data).then(r => r.data),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }).then(r => r.data),
};
