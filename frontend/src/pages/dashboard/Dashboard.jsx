import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { analyticsService } from '../../services/analyticsService';
import { incidentService } from '../../services/incidentService';
import StatCard from '../../components/common/StatCard';
import IncidentTrendChart from '../../components/charts/IncidentTrendChart';
import SeverityPieChart from '../../components/charts/SeverityPieChart';
import ThreatTrendChart from '../../components/charts/ThreatTrendChart';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role?.role_name;
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [severity, setSeverity] = useState([]);
  const [threatStats, setThreatStats] = useState([]);
  const [myStats, setMyStats] = useState({ submitted: 0, open: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [svData] = await Promise.all([analyticsService.getSeverityDistribution()]);
        setSeverity(svData?.data || []);

        if (role === 'admin' || role === 'analyst') {
          const [ovData, trData, ttData] = await Promise.all([
            analyticsService.getOverview(),
            analyticsService.getIncidentTrend(),
            analyticsService.getThreatTrends(),
          ]);
          setOverview(ovData?.data);
          setTrend(trData?.data || []);
          setThreatStats(ttData?.data || []);
        } else {
          const myInc = await incidentService.getMy({ limit: 100 });
          const inc = myInc?.data?.incidents || [];
          setMyStats({
            submitted: myInc?.data?.total || inc.length,
            open: inc.filter(i => ['open','assigned','investigating','under_review'].includes(i.status)).length,
            resolved: inc.filter(i => ['resolved','closed'].includes(i.status)).length,
          });
        }
      } catch (err) {
        console.error('Dashboard load error', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.full_name} —{' '}
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats */}
      {(role === 'admin' || role === 'analyst') ? (
        <div className="stats-grid">
          <div onClick={() => navigate('/incidents/my')} style={{ cursor: 'pointer' }}>
            <StatCard icon="security" value={overview?.total} label="Total Incidents" gradient="linear-gradient(135deg,#00f5ff,#7c3aed)" loading={loading} />
          </div>
          <div onClick={() => navigate('/incidents/my?status=open')} style={{ cursor: 'pointer' }}>
            <StatCard icon="fiber_new" value={overview?.open} label="Open" gradient="linear-gradient(135deg,#f59e0b,#f97316)" loading={loading} />
          </div>
          <div onClick={() => navigate('/incidents/my?severity=critical')} style={{ cursor: 'pointer' }}>
            <StatCard icon="warning" value={overview?.critical} label="Critical" gradient="linear-gradient(135deg,#ef4444,#dc2626)" loading={loading} />
          </div>
          <StatCard icon="speed" value={overview?.avg_risk_score} label="Avg Risk Score" gradient="linear-gradient(135deg,#ec4899,#be185d)" loading={loading} />
          <div onClick={() => navigate('/incidents/my?status=resolved')} style={{ cursor: 'pointer' }}>
            <StatCard icon="check_circle" value={overview?.resolved} label="Resolved" gradient="linear-gradient(135deg,#10b981,#059669)" loading={loading} />
          </div>
          {role === 'admin' && <>
            <div onClick={() => navigate('/admin/users')} style={{ cursor: 'pointer' }}>
              <StatCard icon="psychology" value={overview?.analysts || 5} label="Analysts" gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)" loading={loading} />
            </div>
          </>}
        </div>
      ) : (
        <div className="stats-grid">
          <div onClick={() => navigate('/incidents/my')} style={{ cursor: 'pointer' }}>
            <StatCard icon="report" value={myStats.submitted} label="Submitted" gradient="linear-gradient(135deg,#00f5ff,#7c3aed)" loading={loading} />
          </div>
          <div onClick={() => navigate('/incidents/my?status=open')} style={{ cursor: 'pointer' }}>
            <StatCard icon="pending" value={myStats.open} label="In Progress" gradient="linear-gradient(135deg,#f59e0b,#f97316)" loading={loading} />
          </div>
          <div onClick={() => navigate('/incidents/my?status=resolved')} style={{ cursor: 'pointer' }}>
            <StatCard icon="check_circle" value={myStats.resolved} label="Resolved" gradient="linear-gradient(135deg,#10b981,#059669)" loading={loading} />
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="charts-grid">
        {(role === 'admin') && (
          <div className="card-glass">
            <div className="card-header-custom">
              <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Incident Trend (6 Months)</span>
            </div>
            <div className="card-body-custom">
              <IncidentTrendChart data={trend} />
            </div>
          </div>
        )}

        <div className="card-glass">
          <div className="card-header-custom">
            <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Severity Distribution</span>
          </div>
          <div className="card-body-custom">
            <SeverityPieChart data={severity} />
          </div>
        </div>

        {role === 'admin' && (
          <div className="card-glass">
            <div className="card-header-custom">
              <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Threat Landscape</span>
            </div>
            <div className="card-body-custom">
              <ThreatTrendChart data={threatStats} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
