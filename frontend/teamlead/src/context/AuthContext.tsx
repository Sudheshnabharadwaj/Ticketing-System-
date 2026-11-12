import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { User, UserRole, UserStatus } from '../types/user';
import { supabase } from '../services/supabaseClient';
import {
  apiRequest,
  apiRequestSafe,
  clearBackendSession,
  ensureBackendSession,
  getBackendToken,
  jsonInit,
  loginBackend,
} from '../services/backendAuth';

interface AuthContextType {
  user: User;
  users: User[];
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserProfile: (data: Partial<User>) => Promise<boolean>;
  addUser: (userData: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    department: string;
    role: UserRole;
    status: UserStatus;
    designation?: string;
    password?: string;
    invite_token?: string;
  }) => Promise<{ success: boolean; error?: string; inviteToken?: string }>;
  updateUser: (id: string, data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  toggleUserStatus: (id: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const EMPTY_USER: User = {
  id: '',
  name: '',
  email: '',
  role: 'teamlead',
  department: '',
  status: 'Active',
};

const STORAGE_USER_KEY = 'platform_current_user';

function mapUser(u: any): User {
  return {
    id: String(u?.id || ''),
    name: u?.name || (u?.email ? String(u.email).split('@')[0] : 'User'),
    email: u?.email || '',
    phone: u?.phone || '',
    role: (u?.role === 'admin' ? 'admin' : u?.role === 'teamlead' ? 'teamlead' : 'employee') as UserRole,
    department: u?.department || 'IT Support',
    designation:
      u?.designation || (u?.role === 'admin' ? 'Administrator' : u?.role === 'teamlead' ? 'Team Lead' : 'Team Member'),
    team: u?.team || '',
    avatar: u?.avatar || '',
    location: u?.location || '',
    status: (u?.status === 'Inactive' ? 'Inactive' : 'Active') as UserStatus,
  };
}

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY) || sessionStorage.getItem(STORAGE_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.email) return mapUser(parsed);
  } catch {
    /* ignore corrupted cache */
  }
  return null;
}

function cacheUser(user: User | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      sessionStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_USER_KEY);
      sessionStorage.removeItem(STORAGE_USER_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface RestoreResult {
  profile: any | null;
  status: number;
  error: string | null;
  sessionReady: boolean;
}

/**
 * Module-level in-flight guard for the session restore.
 *
 * React StrictMode mounts effects twice in development, which used to fire two
 * identical `GET /users/profile` requests on every page load. Both effect runs
 * now share a single network round-trip.
 */
let restoreInFlight: Promise<RestoreResult> | null = null;

function restoreSession(): Promise<RestoreResult> {
  if (restoreInFlight) return restoreInFlight;

  const request = (async (): Promise<RestoreResult> => {
    const ready = await ensureBackendSession();
    if (!ready) {
      return { profile: null, status: 401, error: 'No backend session.', sessionReady: false };
    }
    const result = await apiRequestSafe<any>('/users/profile');
    return {
      profile: result.data,
      status: result.status,
      error: result.error,
      sessionReady: true,
    };
  })();

  restoreInFlight = request;
  const clear = () => {
    if (restoreInFlight === request) restoreInFlight = null;
  };
  request.then(clear, clear);
  return request;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const role: UserRole = 'teamlead';
  const [users, setUsers] = useState<User[]>([]);
  const cached = readCachedUser();
  const hasToken = !!getBackendToken();
  const hasRefreshToken = typeof window !== 'undefined' && !!(localStorage.getItem('backend_refresh_token') || sessionStorage.getItem('backend_refresh_token'));
  const hasSession = hasToken || hasRefreshToken;
  const [currentUser, setCurrentUser] = useState<User>(() => cached || EMPTY_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => hasSession && !!cached?.email);
  const [isLoading, setIsLoading] = useState<boolean>(() => hasSession && (!cached?.email || !hasToken));

  const loadUsers = useCallback(async () => {
    const result = await apiRequestSafe<any[]>('/team/users');
    if (result.error) {
      console.warn('Could not load team users:', result.error);
      return;
    }
    setUsers((result.data || []).map(mapUser));
  }, []);

  /** Restore the session from the backend token; never trust cached identity. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await restoreSession();
      if (cancelled) return;
      if (!result.sessionReady) {
        if (!cached?.email) {
          clearBackendSession();
          cacheUser(null);
          setCurrentUser(EMPTY_USER);
          setIsAuthenticated(false);
        } else {
          setCurrentUser(cached);
          setIsAuthenticated(true);
        }
        setIsLoading(false);
        return;
      }
      if (result.error || !result.profile) {
        if (cached?.email) {
          setCurrentUser(cached);
          setIsAuthenticated(true);
        } else if (result.status === 401 || result.status === 403) {
          clearBackendSession();
          cacheUser(null);
          setCurrentUser(EMPTY_USER);
          setIsAuthenticated(false);
        }
        setIsLoading(false);
        return;
      }
      const profile = mapUser(result.profile);
      setCurrentUser(profile);
      setIsAuthenticated(true);
      cacheUser(profile);
      setIsLoading(false);
      void loadUsers();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadUsers]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      return { success: false, error: 'Please enter both Email and Password.' };
    }

    const result = await loginBackend(cleanEmail, password);
    if (!result.ok) {
      return { success: false, error: result.error };
    }
    if (result.user.role !== 'teamlead') {
      // The Team Lead portal is role-scoped; do not let an employee/admin
      // session use team lead data just because the token is valid.
      clearBackendSession();
      cacheUser(null);
      return {
        success: false,
        error: 'This account is not a Team Lead account. Please use the correct portal.',
      };
    }

    const appUser = mapUser(result.user);
    setCurrentUser(appUser);
    setIsAuthenticated(true);
    setIsLoading(false);
    cacheUser(appUser);
    localStorage.setItem('itsm_teamlead_auth', 'true');
    localStorage.removeItem('platform_explicitly_logged_out');
    void loadUsers();
    return { success: true };
  }, [loadUsers]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(EMPTY_USER);
    setUsers([]);
    localStorage.removeItem('itsm_teamlead_auth');
    sessionStorage.removeItem('itsm_teamlead_auth');
    cacheUser(null);
    localStorage.setItem('platform_explicitly_logged_out', 'true');
    sessionStorage.setItem('platform_explicitly_logged_out', 'true');
    clearBackendSession();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('platform-logout'));
    }
  }, []);

  const updateUserProfile = useCallback(async (updatedData: Partial<User>): Promise<boolean> => {
    const payload: Record<string, any> = {};
    for (const field of ['name', 'phone', 'department', 'designation', 'location', 'avatar'] as const) {
      if (updatedData[field] !== undefined) payload[field] = updatedData[field];
    }
    if (Object.keys(payload).length === 0) return true;

    const result = await apiRequestSafe<any>('/users/profile', jsonInit('PATCH', payload));
    if (result.error || !result.data) {
      console.warn('Could not save profile:', result.error);
      return false;
    }

    const saved = mapUser(result.data);
    setCurrentUser(saved);
    cacheUser(saved);
    setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
    return true;
  }, []);

  const addUser = useCallback(async (userData: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    department: string;
    role: UserRole;
    status: UserStatus;
    designation?: string;
    password?: string;
    invite_token?: string;
  }): Promise<{ success: boolean; error?: string; inviteToken?: string }> => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const cleanId = (userData.id || '').trim() || undefined;

    try {
      const created = await apiRequest<any>(
        '/team/users',
        jsonInit('POST', {
          name: userData.name.trim(),
          email: cleanEmail,
          phone: userData.phone || '',
          department: userData.department,
          designation: userData.designation || 'Team Member',
          role: 'employee',
          status: userData.status || 'Active',
          password: userData.password || undefined,
          employee_id: cleanId,
          invite_token: userData.invite_token || undefined,
          send_email_invite: !!userData.password,
        }),
      );
      const createdUser = mapUser(created);
      setUsers((prev) => [createdUser, ...prev.filter((u) => u.id !== createdUser.id)]);
      return { success: true, inviteToken: userData.invite_token };
    } catch (err: any) {
      console.warn('Backend /team/users failed, trying direct Supabase fallback:', err);
      try {
        const cleanRow = {
          id: cleanId || `usr-${Date.now()}`,
          employee_id: cleanId || undefined,
          name: userData.name.trim(),
          email: cleanEmail,
          phone: userData.phone || '',
          department: userData.department,
          role: 'employee',
          status: 'Active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { data: supaUser, error: supaErr } = await supabase
          .from('users')
          .insert([cleanRow])
          .select()
          .single();
        if (!supaErr && supaUser) {
          const createdUser = mapUser(supaUser);
          setUsers((prev) => [createdUser, ...prev.filter((u) => u.id !== createdUser.id)]);
          return { success: true, inviteToken: userData.invite_token };
        }
      } catch (fallbackErr) {
        console.warn('Supabase fallback user creation error:', fallbackErr);
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Could not create the user.',
      };
    }
  }, []);

  const updateUser = useCallback(async (id: string, data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    const payload: Record<string, any> = {};
    for (const field of ['name', 'email', 'phone', 'department', 'designation', 'team', 'status'] as const) {
      if (data[field] !== undefined) payload[field] = data[field];
    }
    try {
      const updated = await apiRequest<any>(
        `/team/users/${encodeURIComponent(id)}`,
        jsonInit('PATCH', payload),
      );
      const mapped = mapUser(updated);
      setUsers((prev) => prev.map((u) => (u.id === id ? mapped : u)));
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Could not update the user.',
      };
    }
  }, []);

  const toggleUserStatus = useCallback(async (id: string) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const newStatus: UserStatus = target.status === 'Active' ? 'Inactive' : 'Active';
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u)));
    try {
      await apiRequest(`/team/users/${encodeURIComponent(id)}`, jsonInit('PATCH', { status: newStatus }));
    } catch (err) {
      // Revert the optimistic update if the server rejected the change.
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: target.status } : u)));
      console.warn('Could not change user status:', err);
    }
  }, [users]);

  const deleteUser = useCallback(async (id: string) => {
    try {
      await apiRequest(`/team/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.warn('Could not delete user:', err);
    }
  }, []);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user: currentUser,
      users,
      role,
      isAuthenticated,
      isLoading,
      login,
      logout,
      updateUserProfile,
      addUser,
      updateUser,
      toggleUserStatus,
      deleteUser,
    }),
    [
      currentUser,
      users,
      role,
      isAuthenticated,
      isLoading,
      login,
      logout,
      updateUserProfile,
      addUser,
      updateUser,
      toggleUserStatus,
      deleteUser,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};
