import React from 'react';

const StatCard = ({ icon, value, label, change, changeType = 'neutral', gradient, loading = false }) => {
  if (loading) {
    return (
      <div className="stat-card">
        <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 28, width: '60%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 14, width: '80%' }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="stat-card"
      style={{ '--stat-gradient': gradient || 'linear-gradient(135deg,#00f5ff,#7c3aed)' }}
    >
      <div className="stat-icon">
        <span className="material-icons">{icon}</span>
      </div>
      <div className="stat-info">
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
        {change !== undefined && (
          <div className={`stat-change ${changeType}`}>
            <span className="material-icons" style={{ fontSize: '0.9rem' }}>
              {changeType === 'positive' ? 'trending_up' : changeType === 'negative' ? 'trending_down' : 'trending_flat'}
            </span>
            {change}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
