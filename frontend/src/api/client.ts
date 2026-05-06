import axios from 'axios';

/**
 * Base HTTP client.
 * Set VITE_API_BASE_URL in .env to point to your FastAPI backend.
 * Default: http://localhost:8000/api/v1
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — add auth token when available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // TODO: redirect to login when auth is implemented
      console.warn('[SmartFlow] Unauthorized — token may be expired');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
