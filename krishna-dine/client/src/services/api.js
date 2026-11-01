import axios from 'axios';
import { API_BASE } from './config';
import { storage } from './storage';

const TOKEN_KEY = 'kd_staff_token';

export const tokenStore = {
  get: () => storage.get(TOKEN_KEY),
  set: (t) => storage.set(TOKEN_KEY, t),
  clear: () => storage.remove(TOKEN_KEY),
};

export const api = axios.create({ baseURL: `${API_BASE}/api`, withCredentials: true, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token && !config.skipAuth) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const listeners = new Set();
/** Subscribe to auth failures (expired / revoked tokens). */
export const onAuthError = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;
    if ((status === 401 && error.config?.headers?.Authorization) || code === 'PASSWORD_CHANGE_REQUIRED') {
      listeners.forEach((fn) => fn({ status, code }));
    }
    return Promise.reject(error);
  }
);

/** Human readable message from an Axios error. */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.error?.message) return err.response.data.error.message;
  if (err?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (err?.message === 'Network Error') return 'Cannot reach the server. Check your internet connection.';
  return fallback;
}

/** Unwraps { success, data } responses. */
export const unwrap = (p) => p.then((r) => r.data.data);

/** Downloads a binary/CSV endpoint that requires auth. */
export async function downloadFile(url, filename, params) {
  const res = await api.get(url, { params, responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
