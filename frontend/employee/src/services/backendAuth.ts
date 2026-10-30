/**
 * Backend session + fetch helpers shared by every portal.
 *
 * The portals authenticate against the FastAPI backend and send a short-lived
 * bearer token on every protected call. Supabase is never called from the
 * browser, so no anon-key data access or client-side password check exists.
 */

const TOKEN_KEY = 'backend_auth_token';
const REFRESH_KEY = 'backend_refresh_token';
const EXPIRY_KEY = 'backend_token_expires_at';

const RAW_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://ticketing-api-0dht.onrender.com'
    : 'http://127.0.0.1:8000');

/** Normalise any configured base (with or without /api/v1) to a single API root. */
export const API_BASE = `${RAW_BASE.replace(/\/+$/, '').replace(/\/api\/v1$/i, '')}/api/v1`;

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teamlead' | 'employee';
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  team?: string | null;
  avatar?: string | null;
  location?: string | null;
  status?: string | null;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

let memoryToken: string | null = null;
let memoryRefresh: string | null = null;
let memoryExpiry: number | null = null;
let refreshPromise: Promise<boolean> | null = null;

function readStorage(key: string): string | null {
  try {
    const fromLocal = localStorage.getItem(key);
    if (fromLocal) return fromLocal;
  } catch {
    /* storage unavailable */
  }
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

function tokenExpiryMs(token: string | null): number | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function readStoredExpiry(): number | null {
  const raw = readStorage(EXPIRY_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Store the short-lived backend API token. */
export function setBackendToken(token: string | null): void {
  memoryToken = token;
  if (!token) {
    memoryExpiry = null;
    writeStorage(TOKEN_KEY, null);
    writeStorage(EXPIRY_KEY, null);
    return;
  }
  memoryExpiry = tokenExpiryMs(token);
  writeStorage(TOKEN_KEY, token);
  writeStorage(EXPIRY_KEY, memoryExpiry ? String(memoryExpiry) : null);
}

/** Store both tokens returned by /auth/login or /auth/refresh. */
export function setBackendSession(
  accessToken: string | null,
  refreshToken: string | null,
  expiresInSeconds?: number,
): void {
  try {
    sessionStorage.removeItem('platform_explicitly_logged_out');
    localStorage.removeItem('platform_explicitly_logged_out');
  } catch {}
  setBackendToken(accessToken);
  memoryRefresh = refreshToken;
  writeStorage(REFRESH_KEY, refreshToken);
  if (accessToken && expiresInSeconds && expiresInSeconds > 0) {
    const expiry = Date.now() + expiresInSeconds * 1000;
    memoryExpiry = expiry;
    writeStorage(EXPIRY_KEY, String(expiry));
  }
}

export function clearBackendSession(): void {
  memoryToken = null;
  memoryRefresh = null;
  memoryExpiry = null;
  writeStorage(TOKEN_KEY, null);
  writeStorage(REFRESH_KEY, null);
  writeStorage(EXPIRY_KEY, null);
}

export function getBackendToken(): string | null {
  const token = memoryToken || readStorage(TOKEN_KEY);
  if (!token) return null;
  const expiry = memoryExpiry ?? readStoredExpiry() ?? tokenExpiryMs(token);
  if (expiry && expiry <= Date.now() + 5_000) return null;
  return token;
}

/** Authorization header for fetch() calls, empty when no token is present. */
export function authHeaders(): Record<string, string> {
  const token = getBackendToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Append the token as a query param for direct-link downloads / inline previews. */
export function withAccessToken(url: string): string {
  const token = getBackendToken();
  if (!token) return url;
  return url + (url.includes('?') ? '&' : '?') + `access_token=${encodeURIComponent(token)}`;
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return `Request failed (${res.status}).`;
    try {
      const parsed = JSON.parse(text);
      const detail = parsed?.detail ?? parsed?.message ?? parsed?.error;
      if (typeof detail === 'string' && detail.trim()) return detail;
      if (Array.isArray(detail)) {
        return detail
          .map((d: any) => (typeof d === 'string' ? d : d?.msg || JSON.stringify(d)))
          .join('; ');
      }
    } catch {
      /* not JSON */
    }
    return text.slice(0, 300);
  } catch {
    return `Request failed (${res.status}).`;
  }
}

export type LoginResult =
  | { ok: true; user: BackendUser }
  | { ok: false; error: string; status: number };

/** Exchange credentials for backend access + refresh tokens. */
export async function loginBackend(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    if (!res.ok) {
      return { ok: false, error: await readErrorDetail(res), status: res.status };
    }
    const data = await res.json();
    if (!data?.access_token || !data?.user) {
      return { ok: false, error: 'The server returned an invalid session.', status: 502 };
    }
    setBackendSession(data.access_token, data.refresh_token || null, data.expires_in);
    return { ok: true, user: data.user as BackendUser };
  } catch {
    return {
      ok: false,
      error: 'Cannot reach the backend API. Make sure the server is running and try again.',
      status: 0,
    };
  }
}

/** Boolean compatibility wrapper. */
export async function loginToBackend(email: string, password: string): Promise<boolean> {
  const result = await loginBackend(email, password);
  return result.ok;
}

/** Register (or activate an invited account) directly through the backend. */
export async function registerBackend(payload: {
  name: string;
  email: string;
  password: string;
  department?: string;
  phone?: string;
  designation?: string;
  team?: string;
  employee_id?: string;
  invite_token?: string;
}): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, email: payload.email.trim().toLowerCase() }),
    });
    if (!res.ok) {
      return { ok: false, error: await readErrorDetail(res), status: res.status };
    }
    const data = await res.json();
    if (!data?.access_token || !data?.user) {
      return { ok: false, error: 'The server returned an invalid session.', status: 502 };
    }
    setBackendSession(data.access_token, data.refresh_token || null, data.expires_in);
    return { ok: true, user: data.user as BackendUser };
  } catch {
    return {
      ok: false,
      error: 'Cannot reach the backend API. Make sure the server is running and try again.',
      status: 0,
    };
  }
}

/** Trigger clean session expiration: wipe storage, dispatch events, and redirect to login if on protected route. */
export function handleSessionExpiration(): void {
  clearBackendSession();
  try {
    sessionStorage.removeItem('platform_current_user');
    localStorage.removeItem('platform_current_user');
    sessionStorage.removeItem('itsm_teamlead_auth');
    localStorage.removeItem('itsm_teamlead_auth');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token');
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('session-expired'));
    window.dispatchEvent(new CustomEvent('platform-auth-changed', { detail: { user: null } }));

    const hash = window.location.hash || '';
    const isHashRouter = hash.startsWith('#/');
    const path = isHashRouter ? hash.slice(1) : window.location.pathname;
    const isAuthRoute =
      path === '/login' ||
      path.startsWith('/login') ||
      path === '/signin' ||
      path.startsWith('/signin') ||
      path.includes('signup') ||
      path.includes('password') ||
      path.includes('register') ||
      path === '' ||
      path === '/';

    if (!isAuthRoute) {
      if (isHashRouter) {
        window.location.replace('#/login');
      } else {
        window.location.replace('/login');
      }
    }
  }
}

/** Use the long-lived refresh token to obtain a new access token. */
export async function refreshBackendSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = memoryRefresh || readStorage(REFRESH_KEY);
  if (!refreshToken) return false;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleSessionExpiration();
        }
        return false;
      }
      const data = await res.json();
      if (!data?.access_token) return false;
      setBackendSession(data.access_token, data.refresh_token || refreshToken, data.expires_in);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** Ensure a valid access token exists, refreshing it when necessary. */
export async function ensureBackendSession(): Promise<boolean> {
  if (getBackendToken()) return true;
  return refreshBackendSession();
}

/**
 * fetch() wrapper that attaches the current access token, refreshes it once on
 * 401, and retries. Protected calls never fall back to an unauthenticated
 * request, so a expired session surfaces as 401 instead of leaking data.
 */
export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  await ensureBackendSession();

  const doFetch = () => {
    const headers = new Headers(init?.headers || {});
    const token = getBackendToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  let res = await doFetch();
  if (res.status === 401) {
    const renewed = await refreshBackendSession();
    if (renewed) {
      res = await doFetch();
    } else if (!readStorage(REFRESH_KEY) && !memoryRefresh) {
      handleSessionExpiration();
    }
  }
  return res;
}

/** Build a JSON RequestInit. */
export function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

/**
 * Call a backend endpoint and parse JSON, throwing ``ApiError`` on failure.
 * Paths may be absolute or relative to ``/api/v1`` (e.g. ``/tickets``).
 */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = /^https?:\/\//i.test(path)
    ? path
    : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await authenticatedFetch(url, init);
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export interface SafeResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/** Non-throwing variant for UI code that renders explicit error states. */
export async function apiRequestSafe<T>(path: string, init?: RequestInit): Promise<SafeResult<T>> {
  try {
    const data = await apiRequest<T>(path, init);
    return { data, error: null, status: 200 };
  } catch (err) {
    if (err instanceof ApiError) {
      return { data: null, error: err.message, status: err.status };
    }
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unexpected network error.',
      status: 0,
    };
  }
}
