import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { formatRelativeTime } from '../../utils/formatters';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/incidents/report': 'Report Incident',
  '/incidents/my': 'My Incidents',
  '/threat-intelligence': 'Threat Intelligence',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
  '/settings': 'Settings',
  '/admin/users': 'User Management',
  '/admin/assignments': 'Assignments',
  '/admin/audit-logs': 'Audit Logs',
};

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [showNotif, setShowNotif] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef(null);

  const title = PAGE_TITLES[location.pathname]
    || (location.pathname.startsWith('/incidents/') ? 'Incident Details' : 'SentinelX');

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav className="navbar-top">
      <div className="navbar-title">{title}</div>
      <div className="navbar-actions">
        <button
          id="theme-toggle-btn"
          className="nav-icon-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          <span className="material-icons" style={{ fontSize: '1.1rem' }}>
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            id="notification-bell-btn"
            className="nav-icon-btn"
            onClick={() => setShowNotif(v => !v)}
            title="Notifications"
          >
            <span className="material-icons" style={{ fontSize: '1.1rem' }}>notifications</span>
            {unreadCount > 0 && (
              <span className="nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotif && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="no-data" style={{ padding: '24px' }}>
                    <span className="material-icons">notifications_off</span>
                    <p>No notifications</p>
                  </div>
                ) : notifications.map(n => (
                  <div
                    key={n.notification_id}
                    className={`notification-item${!n.is_read ? ' unread' : ''}`}
                    onClick={() => { if (!n.is_read) markRead(n.notification_id); setShowNotif(false); }}
                  >
                    {!n.is_read && <div className="notification-dot" />}
                    <div style={{ flex: 1 }}>
                      <div className="notification-title">{n.title}</div>
                      <div className="notification-msg">{n.message}</div>
                      <div className="notification-time">{formatRelativeTime(n.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="notification-footer">
                <Link to="/notifications" onClick={() => setShowNotif(false)}>
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
