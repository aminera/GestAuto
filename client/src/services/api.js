/**
 * Client HTTP minimal (fetch) pour l'API REST GestAuto.
 * Ajoute le JWT, sérialise le JSON et normalise les erreurs.
 */
const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'gestauto_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(method, path, { body, query } = {}) {
  const url = new URL(BASE + path, window.location.origin);
  Object.entries(query ?? {}).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && url.searchParams.set(k, v));

  const headers = { Accept: 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    tokenStore.clear();
    window.location.href = '/login';
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || res.statusText, data.details);
  return data;
}

export const api = {
  get: (path, query) => request('GET', path, { query }),
  post: (path, body) => request('POST', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  delete: (path) => request('DELETE', path),
};

/** Raccourcis CRUD pour une ressource REST (ex : resource('vehicles')). */
export const resource = (name) => ({
  list: (query) => api.get(`/${name}`, query),
  get: (id) => api.get(`/${name}/${id}`),
  create: (data) => api.post(`/${name}`, data),
  update: (id, data) => api.patch(`/${name}/${id}`, data),
  remove: (id) => api.delete(`/${name}/${id}`),
});
