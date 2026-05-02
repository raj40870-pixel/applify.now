/// <reference types="vite/client" />
import axios from 'axios';

const getBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
  const isNative = (window as any).Capacitor?.isNativePlatform?.();

  if (isNative) {
    // Native builds cannot use localhost from device; use deployed backend URL.
    return configuredBaseUrl;
  }

  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocalhost) {
    return '';
  }

  // In local web development, use relative paths to hit the same host.
  return configuredBaseUrl || '';
};

const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authApi = {
  signup: (data: any) => api.post('/api/auth/signup', data),
  login: (data: any) => api.post('/api/auth/login', data),
  getGoogleUrl: () => api.get('/api/auth/google/url'),
  upgrade: (data: any) => api.post('/api/auth/upgrade', data),
};

export const projectsApi = {
  getAll: () => api.get('/api/projects'),
  create: (data: any) => api.post('/api/projects', data),
  uploadLogo: (data: any) => api.post('/api/upload-logo', data),
};

export const buildApi = {
  startBuild: (data: any) => api.post('/api/build', data),
  getStatus: (buildId: string) => api.get(`/api/status/${buildId}`),
  downloadFile: (buildId: string) => api.get(`/api/download/${buildId}`, { responseType: 'blob' }),
  downloadAndroid: (data: any) =>
    api.post('/api/build/android', data, { responseType: 'blob' }),
  downloadIOS: (data: any) =>
    api.post('/api/build/ios', data, { responseType: 'blob' }),
};

export default api;
