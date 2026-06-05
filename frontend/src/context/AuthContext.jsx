import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('sentinelx-token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      if (data.success) setUser(data.data);
    } catch {
      localStorage.removeItem('sentinelx-token');
      localStorage.removeItem('sentinelx-refresh-token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.success) {
      localStorage.setItem('sentinelx-token', data.data.accessToken);
      localStorage.setItem('sentinelx-refresh-token', data.data.refreshToken);
      setUser(data.data.user);
      toast.success(`Welcome back, ${data.data.user.full_name}! 🛡️`);
      navigate('/dashboard');
    }
    return data;
  };

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    if (data.success) {
      localStorage.setItem('sentinelx-token', data.data.accessToken);
      localStorage.setItem('sentinelx-refresh-token', data.data.refreshToken);
      setUser(data.data.user);
      toast.success('Account created! Welcome to SentinelX 🚀');
      navigate('/dashboard');
    }
    return data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('sentinelx-token');
    localStorage.removeItem('sentinelx-refresh-token');
    setUser(null);
    navigate('/login');
    toast.info('You have been logged out.');
  };

  const updateUser = (updatedUser) => setUser(updatedUser);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};
