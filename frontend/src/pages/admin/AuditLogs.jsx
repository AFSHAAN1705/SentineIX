import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Pagination from '../../components/common/Pagination';
import { formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';

const ACTION_COLORS = {
  CREATE: 'badge-success', UPDATE: 'badge-info', DELETE: 'badge-danger',
  LOGIN: 'badge-purple', LOGOUT: 'badge-gray', ASSIGN: 'badge-warning',
  CHANGE_STATUS: 'badge-orange',
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ entity: '', action: '', search: '' });
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { load(); }, [page, filter]);

  const load = async () => {
    setLoading(true);
    try {
      const queryParams = { 
        page, 
        limit: 20,
        action: filter.action || undefined,
        entity_type: filter.entity || undefined,
        search: filter.search || undefined 
      };
      const data = await api.get('/audit', { params: queryParams }).then(r => r.data);
      if (data.success) {
        setLogs(data.data || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  const fmtDiff = (changes) => {
    if (!changes) return null;
    try {
      const obj = typeof changes === 'string' ? JSON.parse(changes) : changes;
      return JSON.stringify(obj, null, 2);
    } catch { return String(changes); }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">{total} entries — full platform activity trail</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1 }}>
          <span className="material-icons">search</span>
          <input placeholder="Search by user, entity ID..."
            value={filter.search} onChange={e => setFilter(prev => ({ ...prev, search: e.target.value }))} />
        </div>
        {[
          { key: 'entity', opts: ['', 'Incident', 'User', 'ThreatFeed', 'Assignment', 'Evidence'] },
          { key: 'action', opts: ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ASSIGN', 'CHANGE_STATUS'] },
        ].map(({ key, opts }) => (
          <select key={key} value={filter[key]} onChange={e => setFilter(prev => ({ ...prev, [key]: e.target.value }))}>
            {opts.map(o => <option key={o} value={o}>{o || `All ${key === 'entity' ? 'Entities' : 'Actions'}`}</option>)}
          </select>
        ))}
      </div>

      <div className="card-glass">
        <div className="table-custom-wrapper">
          <table className="table-custom">
            <thead>
              <tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>IP</th><th>Changes</th></tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>)}</tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={7}><div className="no-data"><span className="material-icons">receipt_long</span><p>No audit logs found</p></div></td></tr>
              ) : logs.map(log => (
                <React.Fragment key={log.log_id}>
                  <tr onClick={() => setExpanded(expanded === log.log_id ? null : log.log_id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDateTime(log.created_at || log.timestamp)}
                    </td>
                    <td style={{ fontSize: '0.82rem', fontWeight: 500 }}>{log.user?.full_name || log.user_id?.slice(0, 8) + '...'}</td>
                    <td><span className={`badge-custom ${ACTION_COLORS[log.action] || 'badge-gray'}`}>{log.action}</span></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{log.entity_type}</td>
                    <td><code style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>{log.entity_id?.slice(0, 12)}…</code></td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.ip_address || '—'}</td>
                    <td>
                      {log.changes ? (
                        <span style={{ color: 'var(--accent-cyan)', fontSize: '0.78rem', cursor: 'pointer' }}>
                          {expanded === log.log_id ? '▾' : '▸'} View
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                  {expanded === log.log_id && log.changes && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0 }}>
                        <pre style={{ background: 'var(--bg-primary)', padding: '12px 16px', fontSize: '0.75rem', color: 'var(--accent-green)', overflow: 'auto', maxHeight: 200, margin: 0, borderTop: '1px solid var(--border-card)' }}>
                          {fmtDiff(log.changes)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default AuditLogs;
