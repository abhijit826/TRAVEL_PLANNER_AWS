import axios from 'axios';

/**
 * Centralized Axios instance for all API calls.
 *
 * Local dev  → http://localhost:5000
 * Production → API Gateway URL (set VITE_API_URL in .env.production)
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 30000,
});

// Attach JWT token from localStorage to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global error handling — redirect to /auth on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default api;
