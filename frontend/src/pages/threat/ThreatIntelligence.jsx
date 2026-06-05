import React, { useState, useEffect } from 'react';
import { threatService } from '../../services/threatService';
import { useAuth } from '../../hooks/useAuth';
import Badge from '../../components/common/Badge';
import SeverityPieChart from '../../components/charts/SeverityPieChart';
import ThreatTrendChart from '../../components/charts/ThreatTrendChart';
import { formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';

const THREAT_TYPES = ['malware','ransomware','phishing','botnet','zero_day','credential_attack','ddos','apt','other'];

const ThreatIntelligence = () => {
  const { user } = useAuth();
  const role = user?.role?.role_name;
  const [threats, setThreats] = useState([]);
  const [stats, setStats] = useState({ total: 0, bySeverity: [], byType: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', threat_type: 'malware', severity: 'medium', source: '', cve_id: '' });

  useEffect(() => { loadData(); }, [search, typeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [td, sd] = await Promise.all([
        threatService.getAll({ search, threat_type: typeFilter, limit: 50 }),
        threatService.getStats(),
      ]);
      setThreats(td?.data?.threats || []);
      setStats(sd?.data || { total: 0, bySeverity: [], byType: [] });
    } catch { toast.error('Failed to load threats'); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await threatService.create(form);
      toast.success('Threat feed added');
      setShowModal(false);
      setForm({ title: '', description: '', threat_type: 'malware', severity: 'medium', source: '', cve_id: '' });
      loadData();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to add threat'); 
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Threat Intelligence</h1>
          <p className="page-subtitle">Monitor and analyze active cyber threats</p>
        </div>
        {(role === 'admin' || role === 'analyst') && (
          <button className="btn-primary-custom" onClick={() => setShowModal(true)}>
            <span className="material-icons" style={{ fontSize: '1.1rem' }}>add</span> Add Threat
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-gradient': 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
          <div className="stat-icon"><span className="material-icons">warning</span></div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Active Threats</div>
          </div>
        </div>
        {stats.bySeverity?.map(s => (
          <div key={s.severity} className="stat-card" style={{ '--stat-gradient': s.severity === 'critical' ? 'linear-gradient(135deg,#dc2626,#991b1b)' : s.severity === 'high' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : s.severity === 'medium' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#10b981,#059669)' }}>
            <div className="stat-icon"><span className="material-icons">security</span></div>
            <div className="stat-info">
              <div className="stat-value">{s.count}</div>
              <div className="stat-label">{s.severity} severity</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card-glass">
          <div className="card-header-custom"><span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>By Severity</span></div>
          <div className="card-body-custom"><SeverityPieChart data={stats.bySeverity || []} /></div>
        </div>
        <div className="card-glass">
          <div className="card-header-custom"><span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>By Threat Type</span></div>
          <div className="card-body-custom"><ThreatTrendChart data={stats.byType || []} /></div>
        </div>
      </div>

      {/* List */}
      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1 }}>
          <span className="material-icons">search</span>
          <input placeholder="Search threats..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {THREAT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="card-glass">
        <div className="table-custom-wrapper">
          <table className="table-custom">
            <thead><tr><th>Title</th><th>Type</th><th>Severity</th><th>CVE</th><th>Source</th><th>Added By</th><th>Date</th></tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>)}</tr>
              )) : threats.length === 0 ? (
                <tr><td colSpan={7}><div className="no-data"><span className="material-icons">radar</span><p>No threats found</p></div></td></tr>
              ) : threats.map(t => (
                <tr key={t.threat_id}>
                  <td style={{ fontWeight: 600 }}>{t.title}</td>
                  <td><span className="badge-custom badge-purple">{t.threat_type?.replace(/_/g, ' ')}</span></td>
                  <td><Badge type="severity" value={t.severity} /></td>
                  <td><code style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem' }}>{t.cve_id || '—'}</code></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t.source || 'Internal'}</td>
                  <td style={{ fontSize: '0.82rem' }}>{t.creator?.full_name}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Threat Feed</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><span className="material-icons">close</span></button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                {[['title','Title *','text'],['source','Source','text'],['cve_id','CVE ID','text']].map(([k,l,t]) => (
                  <div className="form-group-custom" key={k}>
                    <label className="form-label-custom">{l}</label>
                    <input type={t} className="form-control-custom" value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} required={l.includes('*')} />
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group-custom">
                    <label className="form-label-custom">Type</label>
                    <select className="form-control-custom" value={form.threat_type} onChange={e => setForm({ ...form, threat_type: e.target.value })}>
                      {THREAT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group-custom">
                    <label className="form-label-custom">Severity</label>
                    <select className="form-control-custom" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                      {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group-custom">
                  <label className="form-label-custom">Description *</label>
                  <textarea className="form-control-custom" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline-custom" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary-custom">
                  <span className="material-icons" style={{ fontSize: '1rem' }}>add</span> Add Threat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreatIntelligence;
