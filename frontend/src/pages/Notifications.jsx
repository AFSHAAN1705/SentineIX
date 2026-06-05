import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { useNotifications } from '../hooks/useNotifications';
import { formatRelativeTime } from '../utils/formatters';
import { toast } from 'react-toastify';

const TYPE_ICONS = {
  incident_assigned: 'assignment_ind',
  status_updated: 'update',
  incident_resolved: 'check_circle',
  note_added: 'notes',
  threat_added: 'radar',
  evidence_uploaded: 'attach_file',
  general: 'notifications',
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const { markAllRead, fetchNotifications } = useNotifications();

  useEffect(() => { load(); }, [page]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getAll({ page, limit: 20 });
      if (data.success) {
        const notifs = data.data.notifications || [];
        setNotifications(page === 1 ? notifs : prev => [...prev, ...notifs]);
        setTotal(data.data.total || 0);
        setHasMore(notifs.length === 20);
      }
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success('All notifications marked as read');
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.notification_id !== id));
      setTotal(prev => prev - 1);
      fetchNotifications();
    } catch { toast.error('Failed to delete notification'); }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{total} notification{total !== 1 ? 's' : ''} total</p>
        </div>
        <button className="btn-outline-custom" onClick={handleMarkAllRead}>
          <span className="material-icons" style={{ fontSize: '1rem' }}>done_all</span>
          Mark All Read
        </button>
      </div>

      <div className="card-glass">
        {loading && page === 1 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-card)', display: 'flex', gap: 12 }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 14, marginBottom: 6, width: '70%' }} />
                <div className="skeleton" style={{ height: 12, width: '90%' }} />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="no-data" style={{ padding: '60px 20px' }}>
            <span className="material-icons">notifications_off</span>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.notification_id}
              style={{
                display: 'flex', gap: 14, padding: '14px 20px',
                borderBottom: '1px solid var(--border-card)',
                background: n.is_read ? 'transparent' : 'rgba(0,245,255,0.04)',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: n.is_read ? 'var(--bg-input)' : 'rgba(0,245,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-icons" style={{ fontSize: '1.1rem', color: n.is_read ? 'var(--text-muted)' : 'var(--accent-cyan)' }}>
                  {TYPE_ICONS[n.type] || 'notifications'}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: n.is_read ? 400 : 700, fontSize: '0.875rem', marginBottom: 3 }}>{n.title}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.message}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{formatRelativeTime(n.created_at)}</div>
              </div>
              {!n.is_read && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)', flexShrink: 0, alignSelf: 'center' }} />
              )}
              <button
                onClick={() => handleDelete(n.notification_id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignSelf: 'flex-start', padding: 4, borderRadius: 4, flexShrink: 0 }}
                title="Delete"
              >
                <span className="material-icons" style={{ fontSize: '1rem' }}>close</span>
              </button>
            </div>
          ))
        )}

        {hasMore && (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <button className="btn-outline-custom" onClick={() => setPage(p => p + 1)} disabled={loading}>
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
