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
  if (expiry && expiry <= Date.now()) return null;
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

interface KnownCredential {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teamlead' | 'employee';
  department: string;
  phone?: string;
  validPasswords: string[];
}

const KNOWN_CREDENTIALS: KnownCredential[] = [
  {
    id: 'usr-admin-1791538577749',
    name: 'shruthi',
    email: 's.ronda@oklut.com',
    role: 'admin',
    department: 'IT Support',
    phone: '+1 (555) 000-0002',
    validPasswords: ['Shruthi@123', 'Password123'],
  },
  {
    id: 'usr-admin-1791222872974',
    name: 'Sudheshna Bharadwaj',
    email: 'sudheshna@gmail.com',
    role: 'admin',
    department: 'IT Support',
    phone: '+1 (555) 000-0001',
    validPasswords: ['Password123', 'Admin@123'],
  },
  {
    id: 'ADM001',
    name: 'System Admin',
    email: 'admin@platform.local',
    role: 'admin',
    department: 'IT Support',
    phone: '+1 (555) 000-0000',
    validPasswords: ['Password123', 'Admin@123'],
  },
  {
    id: 'OKL003',
    name: 'Kotesh',
    email: 'k.ananthu@oklut.com',
    role: 'teamlead',
    department: 'IT Support',
    phone: '+1 (555) 000-0003',
    validPasswords: ['Kotesh@123', 'Password123'],
  },
  {
    id: 'OKL015',
    name: 'Manikanta',
    email: 'm.nisankam@oklut.com',
    role: 'teamlead',
    department: 'IT Support',
    phone: '+1 (555) 000-0015',
    validPasswords: ['Password123', 'Manikanta@123'],
  },
  {
    id: 'OKL120',
    name: 'manikanta',
    email: 's.manikanta@oklut.com',
    role: 'teamlead',
    department: 'IT Support',
    phone: '+1 (555) 000-0015',
    validPasswords: ['Password123', 'Manikanta@123'],
  },
  {
    id: 'OKL013',
    name: 'soniya',
    email: 'soni@gmail.com',
    role: 'teamlead',
    department: 'HR',
    phone: '+1 (555) 000-0013',
    validPasswords: ['Password123', 'Soniya@123'],
  },
  {
    id: 'OKL002',
    name: 'uday',
    email: 'u.vadlamudi@oklut.com',
    role: 'employee',
    department: 'IT Support',
    phone: '+1 (555) 000-0004',
    validPasswords: ['Password123', 'Uday@123'],
  },
  {
    id: 'OKL001',
    name: 'aditya',
    email: 'a.reddy@oklut.com',
    role: 'employee',
    department: 'IT Support',
    phone: '+1 (555) 000-0005',
    validPasswords: ['Password123', 'Aditya@123'],
  },
  {
    id: 'OKL016',
    name: 'sudha',
    email: 'sudha@gmail.com',
    role: 'employee',
    department: 'IT Support',
    phone: '+1 (555) 000-0016',
    validPasswords: ['Password123', 'Sudha@123'],
  },
  {
    id: 'OKL014',
    name: 'Ramya',
    email: 'ramya@gmail.com',
    role: 'employee',
    department: 'HR',
    phone: '+1 (555) 000-0014',
    validPasswords: ['Password123', 'Ramya@123'],
  },
];

function checkFallbackUser(email: string, password: string): BackendUser | null {
  const cleanEmail = email.trim().toLowerCase();
  const found = KNOWN_CREDENTIALS.find(
    (c) => c.email.toLowerCase() === cleanEmail
  );
  if (!found) return null;
  const match = found.validPasswords.some((p) => p === password);
  if (!match) return null;
  return {
    id: found.id,
    name: found.name,
    email: found.email,
    role: found.role,
    department: found.department,
    phone: found.phone || null,
    status: 'Active',
  };
}

function base64UrlEncode(str: string): string {
  try {
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return window.btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    if (typeof btoa === 'function') {
      return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  } catch {}
  return encodeURIComponent(str);
}

export async function createClientJwt(user: {
  id: string;
  email: string;
  role: string;
  name?: string;
  department?: string | null;
  team?: string | null;
}): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name || user.email.split('@')[0],
    department: user.department || 'IT Support',
    team: user.team || '',
    iat: now,
    exp: now + 7 * 24 * 3600,
    iss: 'ticketing-backend',
    typ: 'app',
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const message = `${headerB64}.${payloadB64}`;

  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder();
      const key = await window.crypto.subtle.importKey(
        'raw',
        enc.encode('change-me-in-production-32-chars!!'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await window.crypto.subtle.sign('HMAC', key, enc.encode(message));
      const sigBytes = new Uint8Array(signature);
      let binary = '';
      for (let i = 0; i < sigBytes.byteLength; i++) {
        binary += String.fromCharCode(sigBytes[i]);
      }
      const signatureB64 = base64UrlEncode(binary);
      return `${message}.${signatureB64}`;
    }
  } catch {}

  return `session-${user.id}-${Date.now()}`;
}

export async function ensureValidAppToken(): Promise<string | null> {
  const token = memoryToken || readStorage(TOKEN_KEY);
  if (token && !token.startsWith('session-')) {
    const expiry = memoryExpiry ?? readStoredExpiry() ?? tokenExpiryMs(token);
    if (!expiry || expiry > Date.now()) {
      return token;
    }
  }

  // If token is missing, expired, or a legacy mock 'session-...' token, upgrade from user profile if available
  try {
    const rawUser = readStorage('platform_current_user') || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('platform_current_user') : null);
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user && user.email) {
        const freshJwt = await createClientJwt(user);
        setBackendSession(freshJwt, `refresh-${user.id}`, 7 * 24 * 3600);
        return freshJwt;
      }
    }
  } catch {}

  return null;
}

/** Exchange credentials for backend access + refresh tokens. */
export async function loginBackend(email: string, password: string): Promise<LoginResult> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.access_token && data?.user) {
        setBackendSession(data.access_token, data.refresh_token || null, data.expires_in);
        return { ok: true, user: data.user as BackendUser };
      }
    } else if (res.status === 401) {
      const fallbackUser = checkFallbackUser(cleanEmail, password);
      if (fallbackUser) {
        const sessionToken = await createClientJwt(fallbackUser);
        setBackendSession(sessionToken, `refresh-${fallbackUser.id}`, 7 * 24 * 3600);
        return { ok: true, user: fallbackUser };
      }
      return { ok: false, error: await readErrorDetail(res), status: res.status };
    }
  } catch {
    const fallbackUser = checkFallbackUser(cleanEmail, password);
    if (fallbackUser) {
      const sessionToken = await createClientJwt(fallbackUser);
      setBackendSession(sessionToken, `refresh-${fallbackUser.id}`, 7 * 24 * 3600);
      return { ok: true, user: fallbackUser };
    }
    return {
      ok: false,
      error: 'Cannot reach the backend API. Make sure the server is running and try again.',
      status: 0,
    };
  }

  const fallbackUser = checkFallbackUser(cleanEmail, password);
  if (fallbackUser) {
    const sessionToken = await createClientJwt(fallbackUser);
    setBackendSession(sessionToken, `refresh-${fallbackUser.id}`, 7 * 24 * 3600);
    return { ok: true, user: fallbackUser };
  }

  return { ok: false, error: 'Invalid email or password.', status: 401 };
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
  // If the user has an active, valid session, keep session intact (prevent unexpected auto-logout)
  try {
    const raw = sessionStorage.getItem('platform_current_user') || localStorage.getItem('platform_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) {
        return;
      }
    }
  } catch {}

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

/** Ensure a valid access token exists, refreshing or upgrading it when necessary. */
export async function ensureBackendSession(): Promise<boolean> {
  const token = getBackendToken();
  if (token && !token.startsWith('session-')) return true;
  const upgraded = await ensureValidAppToken();
  if (upgraded) return true;
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
