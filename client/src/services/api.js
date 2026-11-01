import axios from 'axios';

export const getActiveRoleFromPath = () => {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return 'Admin';
  if (path.startsWith('/resident')) return 'Resident';
  if (path.startsWith('/staff')) return 'SecurityStaff';
  return null;
};

export const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  
  // 1. URL parameter auth_token (useful for headless testing/scripts)
  try {
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('auth_token');
    if (queryToken) return queryToken;
  } catch (_) {}

  // 2. Tab-isolated session storage (primary for concurrent multi-tab sessions)
  try {
    const sessionToken = sessionStorage.getItem('token');
    if (sessionToken) return sessionToken;
  } catch (_) {}

  // 3. Role-scoped localStorage based on portal pathname
  try {
    const activeRole = getActiveRoleFromPath();
    if (activeRole) {
      const roleToken = localStorage.getItem(`token_${activeRole}`);
      if (roleToken) return roleToken;
    }
  } catch (_) {}

  // 4. Fallback to generic localStorage token
  try {
    return localStorage.getItem('token');
  } catch (_) {
    return null;
  }
};

export const RENDER_BACKEND_URL = 'https://societyhub-api-2eoh.onrender.com/api';

/**
 * Normalizes an API URL to ensure it has no trailing slash and includes the required /api prefix.
 * Avoids duplicate path segments like /api/api or missing prefixes.
 *
 * @param {string} url
 * @returns {string}
 */
export const normalizeApiUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned) return '';
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }
  return cleaned;
};

export const getApiBaseUrl = () => {
  // Read VITE_BASE_URL primarily, with fallback to VITE_API_URL
  const envUrl = import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const trimmed = envUrl.trim();
    // If set to relative /api in production on a decoupled host like Vercel, route directly to Render backend
    if (trimmed === '/api' || trimmed === '/api/') {
      if (import.meta.env.PROD) {
        return RENDER_BACKEND_URL;
      }
      return '/api';
    }
    return normalizeApiUrl(trimmed);
  }

  // Authoritative production fallback: route directly to deployed Render backend
  if (import.meta.env.PROD) {
    return RENDER_BACKEND_URL;
  }

  // Local development default
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      const isLoginRequest = requestUrl.includes('/auth/login');
      
      // Never intercept or trigger page redirects on /auth/login failures
      if (!isLoginRequest && typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user_role');
          const activeRole = getActiveRoleFromPath();
          if (activeRole) {
            localStorage.removeItem(`token_${activeRole}`);
          }
        } catch (_) {}

        const path = window.location.pathname;
        const isProtectedRoute = path.startsWith('/admin') || path.startsWith('/resident') || path.startsWith('/staff');
        if (isProtectedRoute && path !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

