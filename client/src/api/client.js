// Small fetch wrapper: adds the JWT, parses JSON and turns API errors into thrown Errors.
const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'taskflow_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(BASE_URL + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('Cannot reach the server. Is the API running?', 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    if (res.status === 401 && token) window.dispatchEvent(new Event('taskflow:unauthorized'));
    const err = data.error || {};
    throw new ApiError(err.message || `Request failed (${res.status})`, res.status, err.details);
  }
  return data;
}

export const api = {
  login: (body) => request('/auth/login', { method: 'POST', body }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  me: () => request('/auth/me'),
  authConfig: () => request('/auth/config'),
  invite: () => request('/users/invite'),

  listTasks: (params) => request('/tasks', { params }),
  createTask: (body) => request('/tasks', { method: 'POST', body }),
  updateTask: (id, body) => request(`/tasks/${id}`, { method: 'PATCH', body }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),

  stats: () => request('/stats'),

  listUsers: (params) => request('/users', { params }),
  userOptions: () => request('/users/options'),
  updateRole: (id, role) => request(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};
