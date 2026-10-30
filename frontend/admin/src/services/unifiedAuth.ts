import { clearBackendSession, getBackendToken, loginBackend, registerBackend } from './backendAuth';

export type UserRoleType = 'admin' | 'teamlead' | 'employee';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  role: UserRoleType;
  password?: string;
  status: 'Active' | 'Pending Invitation' | 'Inactive';
  avatarUrl?: string;
  createdAt?: string;
}

const STORAGE_KEY_USERS = 'platform_all_users';
const STORAGE_KEY_SESSION = 'platform_current_user';

export const INITIAL_PLATFORM_USERS: AppUser[] = [];

// Legacy dummy accounts to clean out from browser localStorage
const DUMMY_EMAILS = [
  'admin@company.com',
  'hyma@company.com',
  'manikanta@company.com',
  'teamlead@company.com',
  'adi@company.com',
  'sudha@company.com',
  'employee@company.com',
  'mounika@company.com'
];
const DUMMY_IDS = [
  'usr-admin-1',
  'usr-admin-2',
  'usr-lead-1',
  'usr-lead-2',
  'usr-lead-3',
  'usr-emp-1',
  'usr-emp-2',
  'usr-emp-3'
];

// Automatically purge legacy dummy data from localStorage on load
if (typeof window !== 'undefined') {
  try {
    const sessionRaw = sessionStorage.getItem(STORAGE_KEY_SESSION) || localStorage.getItem(STORAGE_KEY_SESSION);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (parsed && (DUMMY_EMAILS.includes((parsed.email || '').toLowerCase()) || DUMMY_IDS.includes(parsed.id))) {
        localStorage.removeItem(STORAGE_KEY_SESSION);
        sessionStorage.removeItem(STORAGE_KEY_SESSION);
        localStorage.removeItem('itsm_teamlead_auth');
        sessionStorage.removeItem('itsm_teamlead_auth');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
      }
    }

    const usersRaw = localStorage.getItem(STORAGE_KEY_USERS);
    if (usersRaw) {
      const uList = JSON.parse(usersRaw);
      if (Array.isArray(uList)) {
        const cleanUsers = uList.filter(
          (u: any) => !DUMMY_EMAILS.includes((u.email || '').toLowerCase()) && !DUMMY_IDS.includes(u.id)
        );
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(cleanUsers));
      }
    }
  } catch {}
}

export function getPlatformUsers(): AppUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePlatformUser(user: AppUser): void {
  const users = getPlatformUsers();
  const existingIdx = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...user };
  } else {
    users.unshift(user);
  }
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
}

export function getCurrentSessionUser(): AppUser | null {
  if (typeof window === 'undefined') return null;
  try {
    // If explicitly logged out, never synthesize or return a user
    const explicitlyLoggedOut =
      sessionStorage.getItem('platform_explicitly_logged_out') === 'true' ||
      localStorage.getItem('platform_explicitly_logged_out') === 'true';
    if (explicitlyLoggedOut) {
      return null;
    }

    const raw = sessionStorage.getItem(STORAGE_KEY_SESSION) || localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.email || !parsed.role) {
      return null;
    }

    if (DUMMY_EMAILS.includes(parsed.email.toLowerCase()) || DUMMY_IDS.includes(parsed.id)) {
      sessionStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_SESSION);
      return null;
    }

    // A valid session MUST have either a valid backend access token or a refresh token
    const token = getBackendToken();
    const refreshToken =
      localStorage.getItem('backend_refresh_token') || sessionStorage.getItem('backend_refresh_token');

    const storedToken =
      localStorage.getItem('backend_auth_token') || sessionStorage.getItem('backend_auth_token');

    if (!token && !refreshToken && !storedToken) {
      // Session has expired or tokens are missing
      sessionStorage.removeItem(STORAGE_KEY_SESSION);
      localStorage.removeItem(STORAGE_KEY_SESSION);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function setSessionUser(user: AppUser | null): void {
  if (user) {
    sessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    sessionStorage.removeItem('platform_explicitly_logged_out');
    localStorage.removeItem('platform_explicitly_logged_out');
    // Clear stale cached admin profile so this user's name and role appear correctly
    sessionStorage.removeItem('admin_profile_data');
    sessionStorage.removeItem('admin_profile_avatar');
    localStorage.removeItem('admin_profile_data');
    localStorage.removeItem('admin_profile_avatar');
    if (user.role === 'teamlead') {
      sessionStorage.setItem('itsm_teamlead_auth', 'true');
      localStorage.setItem('itsm_teamlead_auth', 'true');
    } else {
      sessionStorage.removeItem('itsm_teamlead_auth');
      localStorage.removeItem('itsm_teamlead_auth');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('platform-auth-changed', { detail: { user } }));
    }
  } else {
    sessionStorage.removeItem(STORAGE_KEY_SESSION);
    sessionStorage.removeItem('itsm_teamlead_auth');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('backend_auth_token');
    sessionStorage.removeItem('backend_refresh_token');
    sessionStorage.removeItem('backend_token_expires_at');
    sessionStorage.removeItem('admin_profile_data');
    sessionStorage.removeItem('admin_profile_avatar');
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem('itsm_teamlead_auth');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('backend_auth_token');
    localStorage.removeItem('backend_refresh_token');
    localStorage.removeItem('backend_token_expires_at');
    localStorage.removeItem('admin_profile_data');
    localStorage.removeItem('admin_profile_avatar');
    sessionStorage.setItem('platform_explicitly_logged_out', 'true');
    localStorage.setItem('platform_explicitly_logged_out', 'true');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('platform-auth-changed', { detail: { user: null } }));
    }
  }
}

export async function loginUser(email: string, password?: string): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { success: false, error: 'Email is required.' };
  if (!password) return { success: false, error: 'Password is required.' };

  const result = await loginBackend(cleanEmail, password);
  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const dbUser = result.user;
  const appUser: AppUser = {
    id: dbUser.id,
    name: dbUser.name || cleanEmail.split('@')[0],
    email: dbUser.email || cleanEmail,
    phone: dbUser.phone || '',
    department: dbUser.department || 'IT Support',
    role: dbUser.role,
    status: 'Active',
    avatarUrl: dbUser.avatar || '',
    createdAt: dbUser.status || undefined,
  };
  setSessionUser(appUser);
  savePlatformUser(appUser);
  return { success: true, user: appUser };
}

export function logoutUser(): void {
  setSessionUser(null);
  clearBackendSession();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('platform-logout'));
  }
}

export interface RegisterUserData {
  name: string;
  email: string;
  phone?: string;
  department?: string;
  role: UserRoleType;
  password?: string;
  organization?: string;
  teamName?: string;
  leadId?: string;
  employeeId?: string;
  jobTitle?: string;
  inviteToken?: string;
}

export async function registerUser(data: RegisterUserData): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const cleanEmail = data.email.trim().toLowerCase();
  if (!data.password) {
    return { success: false, error: 'Password is required.' };
  }

  const result = await registerBackend({
    name: data.name.trim(),
    email: cleanEmail,
    password: data.password,
    department: data.department,
    phone: data.phone,
    designation: data.jobTitle,
    team: data.teamName,
    employee_id: data.employeeId,
    invite_token: data.inviteToken,
  });

  if (!result.ok) {
    return { success: false, error: result.error };
  }

  const dbUser = result.user;
  const appUser: AppUser = {
    id: dbUser.id,
    name: dbUser.name || data.name.trim(),
    email: dbUser.email || cleanEmail,
    phone: dbUser.phone || '',
    department: dbUser.department || data.department || 'IT Support',
    role: dbUser.role,
    status: 'Active',
    avatarUrl: dbUser.avatar || '',
  };
  setSessionUser(appUser);
  savePlatformUser(appUser);
  return { success: true, user: appUser };
}



