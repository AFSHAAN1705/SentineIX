import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';

const Login = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email, password) => setForm({ email, password });

  return (
    <div className="auth-page">
      <div className="auth-grid-bg" />
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <div className="auth-card animate-fade-in">
        <div className="auth-logo">
          <span className="auth-logo-text">⬡ SENTINEL<span style={{ color: '#7c3aed' }}>X</span></span>
          <span className="auth-logo-tagline">Detect • Report • Resolve</span>
        </div>

        <div className="auth-title">Welcome Back</div>
        <div className="auth-subtitle">Sign in to your SOC account</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group-custom">
            <label className="form-label-custom">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-control-custom"
              placeholder="you@organization.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
            {errors.email && (
              <div className="form-error">
                <span className="material-icons" style={{ fontSize: '0.9rem' }}>error</span>
                {errors.email}
              </div>
            )}
          </div>

          <div className="form-group-custom">
            <label className="form-label-custom">Password</label>
            <div className="password-wrapper">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="form-control-custom"
                placeholder="Your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
              />
              <button type="button" className="password-toggle" onClick={() => setShowPass(v => !v)}>
                <span className="material-icons" style={{ fontSize: '1.1rem' }}>
                  {showPass ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {errors.password && (
              <div className="form-error">
                <span className="material-icons" style={{ fontSize: '0.9rem' }}>error</span>
                {errors.password}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', marginBottom: 20, marginTop: -8 }}>
            <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="btn-primary-custom"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Authenticating...
              </>
            ) : (
              <><span className="material-icons" style={{ fontSize: '1.1rem' }}>login</span> Sign In</>
            )}
          </button>
        </form>

        <div className="cyber-divider" />

        {/* Demo credentials */}
        <div style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.1)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Demo Credentials
          </div>
          {[
            { role: 'Admin', email: 'admin@sentinelx.io', pass: 'Demo@1234' },
            { role: 'Analyst', email: 'analyst1@sentinelx.io', pass: 'Demo@1234' },
            { role: 'Reporter', email: 'reporter1@company.com', pass: 'Demo@1234' },
          ].map(cred => (
            <div key={cred.role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>{cred.role}:</span>
              <button
                type="button"
                style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => fillDemo(cred.email, cred.pass)}
              >
                {cred.email}
              </button>
            </div>
          ))}
        </div>

        <div className="auth-footer-link">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
