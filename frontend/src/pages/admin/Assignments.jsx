import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { incidentService } from '../../services/incidentService';
import { userService } from '../../services/userService';
import Badge from '../../components/common/Badge';
import { formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';

const Assignments = () => {
  const [incidents, setIncidents] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalyst, setSelectedAnalyst] = useState({});
  const [assigning, setAssigning] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const [inc, ana] = await Promise.all([
          incidentService.getAll({ status: 'open', limit: 50 }),
          userService.getAnalysts(),
        ]);
        setIncidents(inc?.data?.incidents || []);
        setAnalysts(ana?.data || []);
      } catch { toast.error('Failed to load data'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const assign = async (incidentId, overrideAnalystId = null) => {
    const analystId = overrideAnalystId || selectedAnalyst[incidentId];
    if (!analystId) return toast.warning('Select an analyst first');
    setAssigning(prev => ({ ...prev, [incidentId]: true }));
    try {
      await api.post(`/incidents/${incidentId}/assign`, { analyst_id: analystId });
      setIncidents(prev => prev.filter(i => i.incident_id !== incidentId));
      toast.success('Incident assigned successfully!');
    } catch (err) { toast.error(err.response?.data?.message || 'Assignment failed'); }
    finally { setAssigning(prev => ({ ...prev, [incidentId]: false })); }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Assign Incidents</h1>
          <p className="page-subtitle">Assign open incidents to analysts for investigation</p>
        </div>
      </div>

      {/* Analyst overview */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {analysts.map(a => (
          <div key={a.user_id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden' }}>
              {a.avatar_url ? <img src={a.avatar_url} alt={a.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : a.full_name?.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{a.full_name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.department || 'Analyst'}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-glass">
        <div className="card-header-custom">
          <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>
            Unassigned Open Incidents
          </span>
          <span className="badge-custom badge-warning">{incidents.length}</span>
        </div>
        <div className="table-custom-wrapper">
          <table className="table-custom">
            <thead>
              <tr><th>Ref</th><th>Title</th><th>Severity</th><th>Reporter</th><th>Date</th><th>Assign To</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>)}</tr>
                ))
              ) : incidents.length === 0 ? (
                <tr><td colSpan={7}><div className="no-data"><span className="material-icons">assignment_turned_in</span><p>All incidents are assigned!</p></div></td></tr>
              ) : incidents.map(inc => (
                <tr key={inc.incident_id}>
                  <td><code style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem' }}>{inc.incident_ref}</code></td>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{inc.title}</td>
                  <td><Badge type="severity" value={inc.severity} /></td>
                  <td style={{ fontSize: '0.82rem' }}>{inc.reporter?.full_name}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(inc.created_at)}</td>
                  <td>
                    <select
                      className="form-control-custom"
                      style={{ padding: '6px 10px', fontSize: '0.82rem', minWidth: 160 }}
                      value={selectedAnalyst[inc.incident_id] || ''}
                      onChange={e => setSelectedAnalyst(prev => ({ ...prev, [inc.incident_id]: e.target.value }))}
                    >
                      <option value="">Select analyst...</option>
                      {analysts.map(a => <option key={a.user_id} value={a.user_id}>{a.full_name}</option>)}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn-primary-custom"
                        style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                        onClick={() => assign(inc.incident_id)}
                        disabled={assigning[inc.incident_id]}
                      >
                        {assigning[inc.incident_id] ? '...' : 'Assign'}
                      </button>
                      
                      {analysts.find(a => a.full_name === 'AI Analyst') && (
                        <button
                          className="btn-outline-custom"
                          style={{ padding: '6px 14px', fontSize: '0.78rem', borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }}
                          onClick={() => {
                            const aiId = analysts.find(a => a.full_name === 'AI Analyst').user_id;
                            setSelectedAnalyst(prev => ({ ...prev, [inc.incident_id]: aiId }));
                            setTimeout(() => assign(inc.incident_id, aiId), 0);
                          }}
                          disabled={assigning[inc.incident_id]}
                        >
                          <span className="material-icons" style={{ fontSize: '1rem', marginRight: 4 }}>psychology</span>
                          AI
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Assignments;
