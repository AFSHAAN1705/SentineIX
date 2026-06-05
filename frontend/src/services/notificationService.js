import api from './api';

export const notificationService = {
  getAll: (params) => api.get('/notifications', { params }).then(r => r.data),
  // Backend uses PATCH not PUT
  markRead: (id) => api.patch(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then(r => r.data),
  delete: (id) => api.delete(`/notifications/${id}`).then(r => r.data),
};
