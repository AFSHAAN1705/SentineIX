import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';

const NavItem = ({ to, icon, label, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
  >
    <span className="material-icons">{icon}</span>
    <span className="sidebar-link-label">{label}</span>
    {badge > 0 && (
      <span className="sidebar-badge">{badge > 99 ? '99+' : badge}</span>
    )}
  </NavLink>
);

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const role = user?.role?.role_name;

  const initials = user?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo-icon">⬡</span>
        <span className="sidebar-logo">SENTINEL<span>X</span></span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">Main</div>
        <NavItem to="/dashboard" icon="dashboard" label="Dashboard" />

        <div className="sidebar-section">Incidents</div>
        {(role === 'reporter' || role === 'admin') && (
          <NavItem to="/incidents/report" icon="add_alert" label="Report Incident" />
        )}
        <NavItem to="/incidents/my" icon="list_alt" label="My Incidents" />

        <div className="sidebar-section">Security</div>
        <NavItem to="/threat-intelligence" icon="radar" label="Threat Intel" />
        <NavItem to="/analytics" icon="analytics" label="Analytics" />
        <NavItem to="/reports" icon="assessment" label="Reports" />

        {role === 'admin' && (
          <>
            <div className="sidebar-section">Administration</div>
            <NavItem to="/admin/users" icon="manage_accounts" label="Users" />
            <NavItem to="/admin/assignments" icon="assignment_ind" label="Assignments" />
            <NavItem to="/admin/audit-logs" icon="receipt_long" label="Audit Logs" />
          </>
        )}

        <div className="sidebar-section">Account</div>
        <NavItem to="/notifications" icon="notifications" label="Notifications" badge={unreadCount} />
        <NavItem to="/profile" icon="person" label="Profile" />
        <NavItem to="/settings" icon="settings" label="Settings" />
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={logout} title="Click to logout">
          <div className="sidebar-user-avatar">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt={user?.full_name} />
              : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name">{user?.full_name}</div>
            <div className="sidebar-user-role">{role}</div>
          </div>
          <span className="material-icons" style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
            logout
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
