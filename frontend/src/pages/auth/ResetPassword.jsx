import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { toast } from 'react-toastify';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    if (!token || !email) return toast.error('Invalid reset link');
    setLoading(true);
    try {
      await authService.resetPassword({ email, token, password });
      toast.success('Password reset successfully! You can now log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-grid-bg" />
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <div className="auth-card animate-fade-in">
        <div className="auth-logo">
          <span className="auth-logo-text">⬡ SENTINEL<span style={{ color: '#7c3aed' }}>X</span></span>
        </div>
        <div className="auth-title">Reset Password</div>
        <div className="auth-subtitle">Create a strong new password</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group-custom">
            <label className="form-label-custom">New Password</label>
            <input type="password" className="form-control-custom" placeholder="Min 8 characters"
              value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="form-group-custom">
            <label className="form-label-custom">Confirm Password</label>
            <input type="password" className="form-control-custom" placeholder="Repeat password"
              value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary-custom"
            style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-footer-link" style={{ marginTop: 16 }}>
          <Link to="/login">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
