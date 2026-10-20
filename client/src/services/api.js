import axios from 'axios';

const DEV_FALLBACK_API_URL = 'http://localhost:5000/api';

const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? DEV_FALLBACK_API_URL : '');

if (!baseURL) {
  throw new Error(
    'VITE_API_URL is not configured. Production builds must define it, e.g. https://api.yourdomain.com/api'
  );
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'Something went wrong. Please try again.';
    if (error.code === 'ERR_NETWORK' || !error.response) {
      message = 'Unable to reach the server. Please check your connection and try again.';
    } else if (error.response.data?.message) {
      message = error.response.data.message;
    }
    return Promise.reject({
      status: error.response?.status ?? 0,
      message,
      errors: error.response?.data?.errors ?? [],
      code: error.response?.data?.code,
      retryAfter: error.response?.data?.retryAfter,
    });
  }
);

export default api;
