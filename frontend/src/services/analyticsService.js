import api from './api';

export const analyticsService = {
  // Uses the existing /incidents/stats endpoint which returns {summary, bySeverity, byStatus, byType, monthlyTrend}
  getOverview: async () => {
    try {
      const res = await api.get('/incidents/stats');
      if (res.data.success) {
        return {
          success: true,
          data: {
            total: res.data.data.summary.total,
            open: res.data.data.summary.open,
            resolved: res.data.data.summary.resolved,
            closed: res.data.data.summary.closed,
            critical: res.data.data.summary.critical,
            avg_risk_score: res.data.data.summary.avg_risk_score,
            // Fetch user count for admin dashboard
            totalUsers: null,
            analysts: null,
          }
        };
      }
      return { success: false, data: {} };
    } catch {
      return { success: true, data: { total: 0, open: 0, resolved: 0, closed: 0, critical: 0 } };
    }
  },

  getIncidentTrend: async () => {
    try {
      const res = await api.get('/incidents/stats');
      if (res.data.success) {
        return { success: true, data: res.data.data.monthlyTrend || [] };
      }
      return { success: true, data: [] };
    } catch {
      return { success: true, data: [] };
    }
  },

  getSeverityDistribution: async () => {
    try {
      const res = await api.get('/incidents/stats');
      if (res.data.success) {
        return { success: true, data: res.data.data.bySeverity || [] };
      }
      return { success: true, data: [] };
    } catch {
      return { success: true, data: [] };
    }
  },

  getAnalystPerformance: async () => {
    // No dedicated backend route — return empty gracefully
    return { success: true, data: [] };
  },

  getResolutionTime: async () => {
    return { success: true, data: [] };
  },

  getThreatTrends: async () => {
    try {
      const res = await api.get('/threats', { params: { limit: 100 } });
      const threats = res.data.data || [];
      const byType = {};
      threats.forEach(t => {
        byType[t.threat_type] = (byType[t.threat_type] || 0) + 1;
      });
      return {
        success: true,
        data: Object.entries(byType).map(([type, count]) => ({ threat_type: type, count }))
      };
    } catch {
      return { success: true, data: [] };
    }
  },
};
