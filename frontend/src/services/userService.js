import api from './api';

export const userService = {
  getAll: (params) => api.get('/users', { params }).then(r => r.data),
  getAnalysts: () => api.get('/users', { params: { role: 'analyst', limit: 100 } }).then(r => r.data),
  getById: (id) => api.get(`/users/${id}`).then(r => r.data),
  update: (id, data) => api.put(`/users/${id}`, data).then(r => r.data),
  changePassword: (id, data) => api.post(`/users/${id}/change-password`, data).then(r => r.data),
  uploadAvatar: (id, formData) =>
    api.post(`/users/${id}/avatar`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data),
  toggleActive: (id) => api.patch(`/users/${id}/toggle-active`).then(r => r.data),
  delete: (id) => api.delete(`/users/${id}`).then(r => r.data),
};
