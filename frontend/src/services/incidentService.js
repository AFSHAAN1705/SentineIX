import api from './api';

export const incidentService = {
  create: (data) => api.post('/incidents', data).then(r => r.data),

  // Backend GET /incidents auto-filters by role (reporter sees own, analyst/admin sees all)
  getAll: (params) => api.get('/incidents', { params }).then(r => {
    const d = r.data;
    return {
      success: d.success,
      data: {
        incidents: d.data || [],
        total: d.pagination?.total || 0,
        totalPages: d.pagination?.pages || 1,
        page: d.pagination?.page || 1,
      }
    };
  }),

  // For analysts — filter assigned incidents
  getAssigned: (params) => api.get('/incidents', { params: { ...params, assigned_to_me: true } }).then(r => {
    const d = r.data;
    return {
      success: d.success,
      data: {
        incidents: d.data || [],
        total: d.pagination?.total || 0,
        totalPages: d.pagination?.pages || 1,
        page: d.pagination?.page || 1,
      }
    };
  }),

  // For reporters — same as getAll (backend auto-filters)
  getMy: (params) => api.get('/incidents', { params }).then(r => {
    const d = r.data;
    return {
      success: d.success,
      data: {
        incidents: d.data || [],
        total: d.pagination?.total || 0,
        totalPages: d.pagination?.pages || 1,
        page: d.pagination?.page || 1,
      }
    };
  }),

  getById: (id) => api.get(`/incidents/${id}`).then(r => r.data),
  updateStatus: (id, data) => api.patch(`/incidents/${id}/status`, data).then(r => r.data),
  delete: (id) => api.delete(`/incidents/${id}`).then(r => r.data),
  getStats: () => api.get('/incidents/stats').then(r => r.data),

  // Notes
  addNote: (incidentId, data) =>
    api.post(`/incidents/${incidentId}/notes`, data).then(r => r.data),
  getNotes: (incidentId) =>
    api.get(`/incidents/${incidentId}/notes`).then(r => r.data),

  // Evidence
  uploadEvidence: (incidentId, formData) =>
    api.post(`/incidents/${incidentId}/evidence`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data),
  getEvidence: (incidentId) =>
    api.get(`/incidents/${incidentId}/evidence`).then(r => r.data),
  deleteEvidence: (id) => api.delete(`/evidence/${id}`).then(r => r.data),

  aiAnalyze: (incidentId) => api.post(`/incidents/${incidentId}/ai-analyze`).then(r => r.data),
  
  getTypes: () => api.get('/incident-types').then(r => r.data),
};
