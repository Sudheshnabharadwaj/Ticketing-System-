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

export const INITIAL_PLATFORM_USERS: AppUser[] = [
  {
    id: 'usr-admin-1',
    name: 'Hyma',
    email: 'admin@company.com',
    phone: '+1 (555) 019-2834',
    department: 'IT Support',
    role: 'admin',
    password: 'Password123',
    status: 'Active',
    avatarUrl: '',
    createdAt: '2026-01-15'
  },
  {
    id: 'usr-admin-2',
    name: 'Hyma Jagarapu',
    email: 'hyma@company.com',
    phone: '+1 (555) 019-2834',
    department: 'IT Support',
    role: 'admin',
    password: 'Password123',
    status: 'Active',
    avatarUrl: '',
    createdAt: '2026-01-15'
  },
  {
    id: 'usr-lead-1',
    name: 'Manikanta',
    email: 'manikanta@company.com',
    phone: '+1 (555) 014-9921',
    department: 'IT Support',
    role: 'teamlead',
    password: 'Password123',
    status: 'Active',
    avatarUrl: '',
    createdAt: '2026-02-01'
  },
  {
    id: 'usr-lead-2',
    name: 'Team Lead',
    email: 'teamlead@company.com',
    phone: '+1 (555) 018-3342',
    department: 'Operations',
    role: 'teamlead',
    password: 'Password123',
    status: 'Active',
    avatarUrl: '',
    createdAt: '2026-03-10'
  },
  {
    id: 'usr-lead-3',
    name: 'Adi',
    email: 'adi@company.com',
    phone: '+1 (555) 018-3342',
    department: 'HR',
    role: 'teamlead',
    password: 'Password123',
    status: 'Active',
    avatarUrl: '',
    createdAt: '2026-03-10'
  },
  {
    id: 'usr-emp-1',
    name: 'Sudha',
    email: 'sudha@company.com',
    phone: '+1 (555) 012-7744',
    department: 'Finance',
    role: 'employee',
    password: 'Password123',
    status: 'Active',
    avatarUrl: '',
    createdAt: '2026-04-12'
  },
  {
    id: 'usr-emp-2',
    name: 'Employee',
    email: 'employee@company.com',
    phone: '+1 (555) 016-5589',
    department: 'IT Support',
    role: 'employee',
    password: 'Password123',
    status: 'Active',
    avatarUrl: '',
    createdAt: '2026-09-20'
  },
  {
    id: 'usr-emp-3',
    name: 'Mounika',
    email: 'mounika@company.com',
    phone: '+1 (555) 016-5589',
    department: 'Operations',
    role: 'employee',
    password: 'Password123',
    status: 'Active',
    avatarUrl: '',
    createdAt: '2026-09-20'
  }
];

export function getPlatformUsers(): AppUser[] {
  if (typeof window === 'undefined') return INITIAL_PLATFORM_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_PLATFORM_USERS));
      return INITIAL_PLATFORM_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PLATFORM_USERS;
  } catch {
    return INITIAL_PLATFORM_USERS;
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
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.email && parsed.role) {
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

export function loginUser(email: string, password?: string): { success: boolean; user?: AppUser; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const users = getPlatformUsers();

  const matched = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!matched) {
    return {
      success: false,
      error: 'No account found with this email address. Please register an account first.'
    };
  }

  // Validate password if provided
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
}

export function registerUser(data: RegisterUserData): { success: boolean; user?: AppUser; error?: string } {
  const cleanEmail = data.email.trim().toLowerCase();
  const users = getPlatformUsers();

  const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
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

  savePlatformUser(newUser);
  return { success: true, user: newUser };
}

