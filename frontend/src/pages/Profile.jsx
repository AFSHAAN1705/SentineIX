import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { formatDateTime } from '../utils/formatters';
import { toast } from 'react-toastify';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const fileRef = useRef();
  const [form, setForm] = useState({ full_name: user?.full_name || '', phone: user?.phone || '', department: user?.department || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await userService.update(user.user_id, form);
      if (data.success) { updateUser({ ...user, ...data.data }); toast.success('Profile updated!'); }
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match');
    if (pwForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setSavingPw(true);
    try {
      await userService.changePassword(user.user_id, { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password'); }
    finally { setSavingPw(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    setUploading(true);
    try {
      const data = await userService.uploadAvatar(user.user_id, fd);
      if (data.success) { updateUser({ ...user, ...data.data }); toast.success('Avatar updated!'); }
    } catch { toast.error('Failed to upload avatar'); }
    finally { setUploading(false); }
  };

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your account information and security</p>
        </div>
      </div>

      {/* Avatar Card */}
      <div className="card-glass" style={{ marginBottom: 20 }}>
        <div className="card-body-custom">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '1.8rem', fontWeight: 700,
                overflow: 'hidden', border: '3px solid var(--accent-cyan)',
                boxShadow: 'var(--glow-cyan)',
              }}>
                {user?.avatar_url
                  ? <img src={user.avatar_url} alt={user.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                title="Change avatar"
              >
                <span className="material-icons" style={{ fontSize: '0.9rem', color: 'white' }}>
                  {uploading ? 'hourglass_empty' : 'camera_alt'}
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </div>
            <div>
              <div style={{ fontFamily: 'Orbitron', fontSize: '1.1rem', fontWeight: 700 }}>{user?.full_name}</div>
              <div style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {user?.role?.role_name}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4 }}>{user?.email}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>
                Last login: {user?.last_login ? formatDateTime(user.last_login) : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card-glass" style={{ marginBottom: 20 }}>
        <div className="card-header-custom">
          <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Personal Information</span>
        </div>
        <div className="card-body-custom">
          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group-custom">
                <label className="form-label-custom">Full Name</label>
                <input type="text" className="form-control-custom" value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="form-group-custom">
                <label className="form-label-custom">Email (read-only)</label>
                <input type="email" className="form-control-custom" value={user?.email || ''} disabled />
              </div>
              <div className="form-group-custom">
                <label className="form-label-custom">Phone</label>
                <input type="tel" className="form-control-custom" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
              </div>
              <div className="form-group-custom">
                <label className="form-label-custom">Department</label>
                <input type="text" className="form-control-custom" value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })} placeholder="IT, Finance, HR..." />
              </div>
            </div>
            <button type="submit" className="btn-primary-custom" disabled={saving}>
              <span className="material-icons" style={{ fontSize: '1.1rem' }}>save</span>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>

      {/* Change Password */}
      <div className="card-glass">
        <div className="card-header-custom">
          <span style={{ fontFamily: 'Orbitron', fontSize: '0.85rem', fontWeight: 700 }}>Change Password</span>
        </div>
        <div className="card-body-custom">
          <form onSubmit={handleChangePassword}>
            {[['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirmPassword', 'Confirm New Password']].map(([k, l]) => (
              <div className="form-group-custom" key={k}>
                <label className="form-label-custom">{l}</label>
                <input type="password" className="form-control-custom"
                  value={pwForm[k]} onChange={e => setPwForm({ ...pwForm, [k]: e.target.value })} required />
              </div>
            ))}
            <button type="submit" className="btn-primary-custom" disabled={savingPw}>
              <span className="material-icons" style={{ fontSize: '1.1rem' }}>lock</span>
              {savingPw ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
