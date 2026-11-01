// Runtime endpoints come from build-time env vars. Empty means "same origin" (dev proxy or same host).
const trim = (s) => String(s || '').replace(/\/+$/, '');

export const API_BASE = trim(import.meta.env.VITE_API_URL);
export const SOCKET_URL = trim(import.meta.env.VITE_SOCKET_URL) || API_BASE || undefined;

/** Resolves server-relative asset paths such as /api/uploads/<id>. */
export function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return `${API_BASE}${path}`;
}
