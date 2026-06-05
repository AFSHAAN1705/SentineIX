import api from './api';

export const reportService = {
  // Dashboard analytics summary
  getAnalytics: (params) =>
    api.get('/reports/analytics', { params }).then(r => r.data),

  // Export — backend supports CSV and PDF only
  exportCSV: (type = 'incidents') =>
    api.get(`/reports/export/csv?type=${type}`, { responseType: 'blob' }),

  exportPDF: (type = 'incidents') =>
    api.get(`/reports/export/pdf?type=${type}`, { responseType: 'blob' }),

  // Unified export helper used by Reports page
  exportReport: async (type, format) => {
    if (format === 'csv') {
      return api.get(`/reports/export/csv?type=${type}`, { responseType: 'blob' });
    } else if (format === 'pdf') {
      return api.get(`/reports/export/pdf?type=${type}`, { responseType: 'blob' });
    }
    // Excel not supported by backend — fall back to CSV
    return api.get(`/reports/export/csv?type=${type}`, { responseType: 'blob' });
  },
};
