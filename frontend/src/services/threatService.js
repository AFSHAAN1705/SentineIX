import api from './api';

export const threatService = {
  create: (data) => api.post('/threats', data).then(r => r.data),

  getAll: (params) => api.get('/threats', { params }).then(r => {
    const d = r.data;
    return {
      success: d.success,
      data: {
        threats: d.data || [],
        total: d.pagination?.total || 0,
        totalPages: d.pagination?.pages || 1,
      }
    };
  }),

  getById: (id) => api.get(`/threats/${id}`).then(r => r.data),

  // Stats — aggregate from the full list since backend has no /stats route
  getStats: async () => {
    try {
      const res = await api.get('/threats', { params: { limit: 500 } });
      const threats = res.data.data || [];
      const total = res.data.pagination?.total || threats.length;

      const bySeverity = [];
      const byType = [];
      const sevCounts = {};
      const typeCounts = {};

      threats.forEach(t => {
        sevCounts[t.severity] = (sevCounts[t.severity] || 0) + 1;
        typeCounts[t.threat_type] = (typeCounts[t.threat_type] || 0) + 1;
      });

      Object.entries(sevCounts).forEach(([severity, count]) => bySeverity.push({ severity, count }));
      Object.entries(typeCounts).forEach(([threat_type, count]) => byType.push({ threat_type, count }));

      return { success: true, data: { total, bySeverity, byType } };
    } catch {
      return { success: true, data: { total: 0, bySeverity: [], byType: [] } };
    }
  },

  update: (id, data) => api.put(`/threats/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/threats/${id}`).then(r => r.data),
};
