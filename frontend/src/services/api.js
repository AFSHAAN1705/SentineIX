import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sentinelx-token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('sentinelx-refresh-token');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
        if (data.success) {
          localStorage.setItem('sentinelx-token', data.data.accessToken);
          localStorage.setItem('sentinelx-refresh-token', data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        }
      } catch {
        localStorage.removeItem('sentinelx-token');
        localStorage.removeItem('sentinelx-refresh-token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
