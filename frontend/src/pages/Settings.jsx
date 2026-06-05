import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const groups = [
    {
      section: 'Appearance', icon: 'palette',
      items: [
        {
          label: 'Dark Mode',
          description: 'Toggle between dark SOC theme and light mode',
          control: (
            <button
              id="settings-theme-toggle"
              onClick={toggleTheme}
              style={{
                position: 'relative', width: 48, height: 26, borderRadius: 13,
                border: 'none', cursor: 'pointer',
                background: theme === 'dark' ? 'linear-gradient(135deg,#00f5ff,#7c3aed)' : '#cbd5e1',
                transition: 'background 0.3s', padding: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3,
                left: theme === 'dark' ? 25 : 3,
                width: 20, height: 20, borderRadius: '50%',
                background: 'white', transition: 'left 0.3s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }} />
            </button>
          ),
        },
        { label: 'Current Theme', description: `Active: ${theme === 'dark' ? '🌑 Dark SOC' : '☀️ Light Mode'}` },
      ],
    },
    {
      section: 'Account', icon: 'person',
      items: [
        { label: 'Email', description: user?.email },
        { label: 'Role', description: user?.role?.role_name },
        { label: 'Department', description: user?.department || 'Not set' },
        { label: 'Account Status', description: user?.is_active ? '✅ Active' : '❌ Inactive' },
        { label: 'Last Login', description: user?.last_login ? new Date(user.last_login).toLocaleString() : 'N/A' },
      ],
    },
    {
      section: 'Notifications', icon: 'notifications',
      items: [
        { label: 'Polling Interval', description: 'Notifications refresh automatically every 30 seconds' },
        { label: 'Bell Icon', description: 'Shows unread count in the top navbar and sidebar' },
      ],
    },
    {
      section: 'Security', icon: 'security',
      items: [
        { label: 'Access Token Expiry', description: '15 minutes (auto-refresh enabled via refresh token)' },
        { label: 'Refresh Token Expiry', description: '7 days — re-login required after expiry' },
        { label: 'Rate Limiting', description: 'Max 100 requests per 15-minute window' },
        { label: 'Password Policy', description: 'Minimum 8 characters, hashed with bcrypt (12 rounds)' },
        { label: 'File Uploads', description: 'Max 10MB per file — images, PDF, Word, ZIP, video' },
      ],
    },
    {
      section: 'Platform', icon: 'info',
      items: [
        { label: 'Version', description: 'SentinelX v1.0.0' },
        { label: 'Stack', description: 'React 18 + Node.js + Express + PostgreSQL' },
        { label: 'Database', description: 'PostgreSQL (Neon-ready, Sequelize ORM)' },
        { label: 'Deployment', description: 'Frontend → Vercel | Backend → Render | DB → Neon' },
      ],
    },
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your SentinelX preferences</p>
        </div>
      </div>

      {groups.map(group => (
        <div key={group.section} className="card-glass" style={{ marginBottom: 20 }}>
          <div className="card-header-custom">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-icons" style={{ color: 'var(--accent-cyan)', fontSize: '1.1rem' }}>{group.icon}</span>
              <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>{group.section}</span>
            </div>
          </div>
          <div className="card-body-custom">
            {group.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: i < group.items.length - 1 ? '1px solid var(--border-card)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{item.description}</div>
                </div>
                {item.control && <div>{item.control}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Settings;
