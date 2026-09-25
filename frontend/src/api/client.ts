/**
 * Centralised API client for the Smart Parking Admin Dashboard.
 * Injects JWT from localStorage on every request, handles 401 by clearing
 * the stored token, and throws structured errors on non-2xx responses.
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

interface ApiError extends Error {
  status: number;
  body: unknown;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/';
  }

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = null; }
    const err = new Error(
      (body as { message?: string })?.message ?? `HTTP ${res.status}`
    ) as ApiError;
    err.status = res.status;
    err.body = body;
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
