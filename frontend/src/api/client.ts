/**
 * Centralised API client for the Smart Parking Admin Dashboard.
 * Injects JWT from localStorage and X-Client-Type: admin-web on every request,
 * handles 401 by clearing stored tokens, captures X-Total-Count header,
 * and throws structured errors on non-2xx responses.
 */

const BASE = '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('sp_token');
}

export function clearToken(): void {
  localStorage.removeItem('sp_token');
  localStorage.removeItem('sp_user');
}

export function saveToken(token: string): void {
  localStorage.setItem('sp_token', token);
}

export function loadUser<T>(): T | null {
  try {
    const raw = localStorage.getItem('sp_user');
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: unknown): void {
  localStorage.setItem('sp_user', JSON.stringify(user));
}

export interface ApiError extends Error {
  status: number;
  code?: string;
  retryAfter?: number;
  body: any;
}

export interface PaginatedResult<T> {
  data: T;
  totalCount: number;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Type': 'admin-web',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
      window.location.href = '/';
    }
  }

  if (!res.ok) {
    let body: any;
    try { body = await res.json(); } catch { body = null; }

    const message = body?.error || body?.message || `HTTP ${res.status}`;
    const err = new Error(message) as ApiError;
    err.status = res.status;
    err.code = body?.code;
    err.retryAfter = body?.retryAfter ?? (res.headers.get('Retry-After') ? parseInt(res.headers.get('Retry-After')!, 10) : undefined);
    err.body = body;
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function requestWithMeta<T>(
  path: string,
  options: RequestInit = {}
): Promise<PaginatedResult<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Type': 'admin-web',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
      window.location.href = '/';
    }
  }

  if (!res.ok) {
    let body: any;
    try { body = await res.json(); } catch { body = null; }

    const message = body?.error || body?.message || `HTTP ${res.status}`;
    const err = new Error(message) as ApiError;
    err.status = res.status;
    err.code = body?.code;
    err.retryAfter = body?.retryAfter ?? (res.headers.get('Retry-After') ? parseInt(res.headers.get('Retry-After')!, 10) : undefined);
    err.body = body;
    throw err;
  }

  const countHeader = res.headers.get('X-Total-Count');
  const totalCount = countHeader ? parseInt(countHeader, 10) : 0;
  const data = (await res.json()) as T;

  return {
    data,
    totalCount: isNaN(totalCount) ? (Array.isArray(data) ? data.length : 0) : totalCount,
  };
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  getPaginated: <T>(path: string) => requestWithMeta<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
