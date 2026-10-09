import { supabase } from './supabaseClient';

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
    const sessionRaw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (parsed && (DUMMY_EMAILS.includes((parsed.email || '').toLowerCase()) || DUMMY_IDS.includes(parsed.id))) {
        localStorage.removeItem(STORAGE_KEY_SESSION);
        localStorage.removeItem('itsm_teamlead_auth');
        localStorage.removeItem('auth_token');
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
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && parsed.email && parsed.role) {
        if (DUMMY_EMAILS.includes(parsed.email.toLowerCase()) || DUMMY_IDS.includes(parsed.id)) {
          localStorage.removeItem(STORAGE_KEY_SESSION);
          return null;
        }
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function setSessionUser(user: AppUser | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    localStorage.removeItem('platform_explicitly_logged_out');
    if (user.role === 'teamlead') {
      localStorage.setItem('itsm_teamlead_auth', 'true');
    }
  } else {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem('itsm_teamlead_auth');
    localStorage.removeItem('auth_token');
    localStorage.setItem('platform_explicitly_logged_out', 'true');
  }
}

export async function loginUser(email: string, password?: string): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Direct query to Supabase users table
  try {
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (dbUser) {
      if (!password) {
        return { success: false, error: 'Password is required.' };
      }
      const isPasswordValid =
        dbUser.password === password ||
        (password === 'Password123' && (!dbUser.password || dbUser.password === 'Password123'));

      if (!isPasswordValid) {
        return { success: false, error: 'Incorrect password. Please verify your credentials.' };
      }

      const appUser: AppUser = {
        id: dbUser.id,
        name: dbUser.name || cleanEmail.split('@')[0],
        email: dbUser.email,
        phone: dbUser.phone || '',
        department: dbUser.department || 'IT Support',
        role: (dbUser.role || 'admin') as UserRoleType,
        status: dbUser.status || 'Active',
      };
      setSessionUser(appUser);
      return { success: true, user: appUser };
    }
  } catch (e) {
    console.warn('Supabase login query error:', e);
  }

  // 2. Fallback check for unregistered email
  const users = getPlatformUsers();
  const matched = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!matched) {
    return {
      success: false,
      error: 'No account found with this email address. Please register an account first.'
    };
  }

  if (!password) {
    return { success: false, error: 'Password is required.' };
  }

  const isPasswordValid =
    matched.password === password ||
    (password === 'Password123' && (!matched.password || matched.password === 'Password123'));

  if (!isPasswordValid) {
    return { success: false, error: 'Incorrect password. Please verify your credentials.' };
  }

  setSessionUser(matched);
  return { success: true, user: matched };
}

export function logoutUser(): void {
  setSessionUser(null);
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

  // Check Supabase if user already exists
  try {
    const { data: existingDb } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingDb) {
      if (existingDb.status === 'Active') {
        return { success: false, error: 'An active account with this email address already exists. Please sign in instead.' };
      }

      // User was granted access by Admin or TeamLead
      if (existingDb.status === 'Pending Invitation') {
        if (existingDb.invite_token && (!data.inviteToken || existingDb.invite_token.trim() !== data.inviteToken.trim())) {
          return { success: false, error: 'Email verification required. Please click the verification link sent by your administrator or enter your invitation token.' };
        }

        const updatedUser: AppUser = {
          id: existingDb.id,
          name: data.name.trim() || existingDb.name,
          email: cleanEmail,
          phone: data.phone || existingDb.phone || '',
          department: data.department || existingDb.department || 'IT Operations',
          role: (existingDb.role || data.role) as UserRoleType,
          password: data.password || 'Password123',
          status: 'Active',
          avatarUrl: existingDb.avatar || '',
          createdAt: existingDb.created_at || new Date().toISOString().split('T')[0]
        };

        const { error: updErr } = await supabase
          .from('users')
          .update({
            name: updatedUser.name,
            phone: updatedUser.phone,
            department: updatedUser.department,
            role: updatedUser.role,
            status: 'Active',
            password: updatedUser.password,
            invite_token: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDb.id);

        if (updErr) {
          console.error('Supabase user activation error:', updErr);
          return { success: false, error: updErr.message };
        }

        savePlatformUser(updatedUser);
        return { success: true, user: updatedUser };
      }
    }
  } catch (e: any) {
    console.warn('Error checking existing user in Supabase:', e);
  }

  const newUser: AppUser = {
    id: `usr-${data.role}-${Date.now()}`,
    name: data.name.trim(),
    email: cleanEmail,
    phone: data.phone || '',
    department: data.department || (data.role === 'admin' ? 'IT Operations' : data.role === 'teamlead' ? 'IT Support' : 'Engineering'),
    role: data.role,
    password: data.password || 'Password123',
    status: 'Active',
    avatarUrl: '',
    createdAt: new Date().toISOString().split('T')[0]
  };

  // Direct insert to Supabase users table
  const { error: insErr } = await supabase.from('users').insert([{
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    phone: newUser.phone,
    department: newUser.department,
    role: newUser.role,
    status: 'Active',
    password: newUser.password,
  }]);

  if (insErr) {
    console.error('Supabase user insert error:', insErr);
    return { success: false, error: insErr.message };
  }

  savePlatformUser(newUser);

  return { success: true, user: newUser };
}



