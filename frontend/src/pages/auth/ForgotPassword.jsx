import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { toast } from 'react-toastify';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
      toast.success('Reset link sent! Check your inbox.');
    } catch {
      toast.error('Failed to send reset email. Check the address and try again.');
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

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <span className="material-icons" style={{ fontSize: '3rem', color: 'var(--accent-green)', display: 'block', marginBottom: 12 }}>
              mark_email_read
            </span>
            <div className="auth-title">Check Your Inbox</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 8, marginBottom: 24 }}>
              We sent a password reset link to{' '}
              <strong style={{ color: 'var(--accent-cyan)' }}>{email}</strong>.{' '}
              The link expires in 1 hour.
            </p>
            <Link to="/login" className="btn-primary-custom" style={{ textDecoration: 'none', justifyContent: 'center', display: 'inline-flex' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <div className="auth-title">Forgot Password?</div>
            <div className="auth-subtitle">Enter your email to receive a reset link</div>
            <form onSubmit={handleSubmit}>
              <div className="form-group-custom">
                <label className="form-label-custom">Email Address</label>
                <input type="email" className="form-control-custom" placeholder="you@organization.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button id="forgot-submit-btn" type="submit" className="btn-primary-custom"
                style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Sending...' : (
                  <><span className="material-icons" style={{ fontSize: '1.1rem' }}>send</span> Send Reset Link</>
                )}
              </button>
            </form>
            <div className="auth-footer-link" style={{ marginTop: 16 }}>
              <Link to="/login">← Back to Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
