import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';

const Register = () => {
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', phone: '', department: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.fullName || form.fullName.length < 2) errs.fullName = 'Full name required (min 2 chars)';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required';
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        department: form.department,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const F = (key, label, type = 'text', placeholder = '') => (
    <div className="form-group-custom">
      <label className="form-label-custom">{label}</label>
      <input type={type} className="form-control-custom" placeholder={placeholder}
        value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
      {errors[key] && (
        <div className="form-error">
          <span className="material-icons" style={{ fontSize: '0.9rem' }}>error</span>
          {errors[key]}
        </div>
      )}
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-grid-bg" />
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <div className="auth-card animate-fade-in" style={{ maxWidth: 520 }}>
        <div className="auth-logo">
          <span className="auth-logo-text">⬡ SENTINEL<span style={{ color: '#7c3aed' }}>X</span></span>
          <span className="auth-logo-tagline">Create Your Account</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            {F('fullName', 'Full Name *', 'text', 'John Doe')}
            {F('email', 'Email Address *', 'email', 'you@org.com')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            {F('phone', 'Phone (Optional)', 'tel', '+1 (555) 000-0000')}
            {F('department', 'Department (Optional)', 'text', 'IT, Finance...')}
          </div>

          <div className="form-group-custom">
            <label className="form-label-custom">Password *</label>
            <div className="password-wrapper">
              <input type={showPass ? 'text' : 'password'} className="form-control-custom"
                placeholder="Min 8 characters" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} />
              <button type="button" className="password-toggle" onClick={() => setShowPass(v => !v)}>
                <span className="material-icons" style={{ fontSize: '1.1rem' }}>{showPass ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            {errors.password && <div className="form-error"><span className="material-icons" style={{ fontSize: '0.9rem' }}>error</span>{errors.password}</div>}
          </div>

          <div className="form-group-custom">
            <label className="form-label-custom">Confirm Password *</label>
            <input type="password" className="form-control-custom" placeholder="Repeat password"
              value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
            {errors.confirmPassword && <div className="form-error"><span className="material-icons" style={{ fontSize: '0.9rem' }}>error</span>{errors.confirmPassword}</div>}
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            className="btn-primary-custom"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : (
              <><span className="material-icons" style={{ fontSize: '1.1rem' }}>person_add</span> Create Account</>
            )}
          </button>
        </form>

        <div className="auth-footer-link" style={{ marginTop: 16 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
