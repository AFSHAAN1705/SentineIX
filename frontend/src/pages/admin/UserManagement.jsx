import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import Pagination from '../../components/common/Pagination';
import { formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, [page, roleFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await userService.getAll({ page, limit: 15, role: roleFilter, search });
      if (data.success) {
        setUsers(data.data.users || []);
        setTotalPages(data.data.totalPages || 1);
        setTotal(data.data.total || 0);
      }
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await userService.toggleActive(id);
      setUsers(prev => prev.map(u => u.user_id === id ? { ...u, is_active: !u.is_active } : u));
      toast.success(`User ${isActive ? 'deactivated' : 'activated'}`);
    } catch { toast.error('Failed to update user'); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Permanently delete this user? This cannot be undone.')) return;
    try {
      await userService.delete(id);
      setUsers(prev => prev.filter(u => u.user_id !== id));
      setTotal(prev => prev - 1);
      toast.success('User deleted');
    } catch { toast.error('Failed to delete user'); }
  };

  const ROLE_BADGE = { admin: 'badge-critical', analyst: 'badge-purple', reporter: 'badge-info' };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{total} registered user{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1 }}>
          <span className="material-icons">search</span>
          <input placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            onKeyDown={e => e.key === 'Enter' && load()}
          />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="analyst">Analyst</option>
          <option value="reporter">Reporter</option>
        </select>
        <button className="btn-outline-custom" onClick={load} style={{ padding: '8px 16px' }}>
          <span className="material-icons" style={{ fontSize: '1rem' }}>refresh</span>
        </button>
      </div>

      <div className="card-glass">
        <div className="table-custom-wrapper">
          <table className="table-custom">
            <thead>
              <tr>
                <th>User</th><th>Email</th><th>Role</th><th>Department</th>
                <th>Status</th><th>Last Login</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 16, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="no-data">
                      <span className="material-icons">group_off</span>
                      <p>No users found</p>
                    </div>
                  </td>
                </tr>
              ) : users.map(u => (
                <tr key={u.user_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.82rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt={u.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : u.full_name?.charAt(0)}
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td>
                    <span className={`badge-custom ${ROLE_BADGE[u.role?.role_name] || 'badge-gray'}`}>
                      {u.role?.role_name}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{u.department || '—'}</td>
                  <td>
                    <span className={`badge-custom ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {u.last_login ? formatDateTime(u.last_login) : 'Never'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => toggleActive(u.user_id, u.is_active)}
                        className="btn-outline-custom"
                        style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                        title={u.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <span className="material-icons" style={{ fontSize: '0.9rem' }}>
                          {u.is_active ? 'block' : 'check_circle'}
                        </span>
                      </button>
                      <button
                        onClick={() => deleteUser(u.user_id)}
                        className="btn-danger-custom"
                        style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                        title="Delete user"
                      >
                        <span className="material-icons" style={{ fontSize: '0.9rem' }}>delete</span>
                      </button>
                    </div>
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

export default UserManagement;
