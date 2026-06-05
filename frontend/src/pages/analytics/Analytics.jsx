import React, { useEffect, useState } from 'react';
import { analyticsService } from '../../services/analyticsService';
import IncidentTrendChart from '../../components/charts/IncidentTrendChart';
import SeverityPieChart from '../../components/charts/SeverityPieChart';
import ThreatTrendChart from '../../components/charts/ThreatTrendChart';
import StatCard from '../../components/common/StatCard';

const Analytics = () => {
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [severity, setSeverity] = useState([]);
  const [threatTrends, setThreatTrends] = useState([]);
  const [resolutionTime, setResolutionTime] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ov, tr, sv, tt, rt] = await Promise.all([
          analyticsService.getOverview(),
          analyticsService.getIncidentTrend(),
          analyticsService.getSeverityDistribution(),
          analyticsService.getThreatTrends(),
          analyticsService.getResolutionTime(),
        ]);
        setOverview(ov?.data);
        setTrend(tr?.data || []);
        setSeverity(sv?.data || []);
        setThreatTrends(tt?.data || []);
        setResolutionTime(rt?.data);
      } catch (e) {
        console.error('Analytics load error', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Security Analytics</h1>
          <p className="page-subtitle">Platform-wide security metrics and insights</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon="security" value={overview?.total} label="Total Incidents" gradient="linear-gradient(135deg,#00f5ff,#7c3aed)" loading={loading} />
        <StatCard icon="fiber_new" value={overview?.open} label="Active Incidents" gradient="linear-gradient(135deg,#f59e0b,#f97316)" loading={loading} />
        <StatCard icon="check_circle" value={overview?.resolved} label="Resolved" gradient="linear-gradient(135deg,#10b981,#059669)" loading={loading} />
        <StatCard icon="warning" value={overview?.critical} label="Critical" gradient="linear-gradient(135deg,#ef4444,#dc2626)" loading={loading} />
        <StatCard
          icon="schedule"
          value={resolutionTime?.avg_hours ? `${parseFloat(resolutionTime.avg_hours).toFixed(1)}h` : 'N/A'}
          label="Avg Resolution Time"
          gradient="linear-gradient(135deg,#3b82f6,#2563eb)"
          loading={loading}
        />
        <StatCard
          icon="speed"
          value={overview?.avg_risk_score ? `${parseFloat(overview.avg_risk_score).toFixed(1)}` : 'N/A'}
          label="Avg Risk Score"
          gradient="linear-gradient(135deg,#ec4899,#be185d)"
          loading={loading}
        />
        <StatCard icon="psychology" value={overview?.closed || 0} label="AI Insights Logged" gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)" loading={loading} />
      </div>

      <div className="charts-grid">
        <div className="card-glass">
          <div className="card-header-custom">
            <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Incident Trend (6 Months)</span>
          </div>
          <div className="card-body-custom">
            <IncidentTrendChart data={trend} />
          </div>
        </div>

        <div className="card-glass">
          <div className="card-header-custom">
            <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Severity Distribution</span>
          </div>
          <div className="card-body-custom">
            <SeverityPieChart data={severity} />
          </div>
        </div>

        <div className="card-glass">
          <div className="card-header-custom">
            <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Threat Intelligence Breakdown</span>
          </div>
          <div className="card-body-custom">
            <ThreatTrendChart data={threatTrends} />
          </div>
        </div>

        <div className="card-glass">
          <div className="card-header-custom">
            <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Resolution Time Analysis</span>
          </div>
          <div className="card-body-custom">
            {resolutionTime ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, padding: '8px 0' }}>
                {[
                  { label: 'Average', value: `${parseFloat(resolutionTime.avg_hours || 0).toFixed(1)}h`, color: 'var(--accent-cyan)' },
                  { label: 'Fastest', value: `${parseFloat(resolutionTime.min_hours || 0).toFixed(1)}h`, color: 'var(--accent-green)' },
                  { label: 'Slowest', value: `${parseFloat(resolutionTime.max_hours || 0).toFixed(1)}h`, color: 'var(--accent-red)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center', padding: '20px 12px', background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border-card)' }}>
                    <div style={{ fontFamily: 'Orbitron', fontSize: '1.6rem', fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6 }}>{label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-data"><span className="material-icons">schedule</span><p>No resolution data yet</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
