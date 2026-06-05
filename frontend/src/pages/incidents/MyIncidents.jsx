import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { incidentService } from '../../services/incidentService';
import { useAuth } from '../../hooks/useAuth';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import { formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';

const MyIncidents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = user?.role?.role_name;
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ 
    status: searchParams.get('status') || '', 
    severity: searchParams.get('severity') || '', 
    search: searchParams.get('search') || '' 
  });

  useEffect(() => { load(); }, [page, filters, role]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, ...filters };
      const fn = role === 'admin'
        ? incidentService.getAll
        : role === 'analyst'
        ? incidentService.getAssigned
        : incidentService.getMy;
      const data = await fn(params);
      if (data.success) {
        setIncidents(data.data.incidents || []);
        setTotalPages(data.data.totalPages || 1);
        setTotal(data.data.total || 0);
      }
    } catch { toast.error('Failed to load incidents'); }
    finally { setLoading(false); }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {role === 'admin' ? 'All Incidents' : role === 'analyst' ? 'Assigned to Me' : 'My Incidents'}
          </h1>
          <p className="page-subtitle">{total} incident{total !== 1 ? 's' : ''} found</p>
        </div>
        {role !== 'analyst' && (
          <Link to="/incidents/report" className="btn-primary-custom" style={{ textDecoration: 'none' }}>
            <span className="material-icons" style={{ fontSize: '1.1rem' }}>add_alert</span>
            Report Incident
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1 }}>
          <span className="material-icons">search</span>
          <input placeholder="Search by title, ref ID..."
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)} />
        </div>
        <select value={filters.status} onChange={e => updateFilter('status', e.target.value)}>
          <option value="">All Status</option>
          {['open','assigned','investigating','under_review','resolved','closed'].map(s =>
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          )}
        </select>
        <select value={filters.severity} onChange={e => updateFilter('severity', e.target.value)}>
          <option value="">All Severity</option>
          {['low','medium','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card-glass">
        <div className="table-custom-wrapper">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Ref #</th><th>Title</th><th>Type</th><th>Severity</th>
                <th>Status</th><th>Risk</th><th>Reporter</th><th>Date</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="no-data">
                      <span className="material-icons">inbox</span>
                      <p>No incidents found</p>
                    </div>
                  </td>
                </tr>
              ) : incidents.map(inc => (
                <tr key={inc.incident_id} onClick={() => navigate(`/incidents/${inc.incident_id}`)}>
                  <td><code style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem' }}>{inc.incident_ref}</code></td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{inc.title}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{inc.incidentType?.type_name}</td>
                  <td><Badge type="severity" value={inc.severity} /></td>
                  <td><Badge type="status" value={inc.status} /></td>
                  <td>
                    {inc.risk_score ? (
                      <span style={{ fontFamily: 'Orbitron', fontSize: '0.8rem', color: inc.risk_score >= 75 ? '#ef4444' : inc.risk_score >= 50 ? '#f97316' : inc.risk_score >= 25 ? '#f59e0b' : '#10b981' }}>
                        {inc.risk_score}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{inc.reporter?.full_name}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(inc.created_at)}</td>
                  <td>
                    <button
                      className="btn-outline-custom"
                      style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                      onClick={e => { e.stopPropagation(); navigate(`/incidents/${inc.incident_id}`); }}
                    >
                      <span className="material-icons" style={{ fontSize: '0.9rem' }}>open_in_new</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default MyIncidents;
