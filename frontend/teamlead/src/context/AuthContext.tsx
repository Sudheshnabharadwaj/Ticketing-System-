import React, { createContext, useState, useEffect } from 'react';
import { User, UserRole, UserStatus } from '../types/user';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
  user: User;
  users: User[];
  role: UserRole;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserProfile: (data: Partial<User>) => void;
  addUser: (userData: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    department: string;
    role: UserRole;
    status: UserStatus;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  toggleUserStatus: (id: string) => void;
  deleteUser: (id: string) => void;
}

const DEFAULT_USER: User = {
  id: 'usr-admin-1791203472315',
  name: 'Sudheshna Bharadwaj',
  email: 'sudheshnabharadwaj@gmail.com',
  role: 'teamlead',
  department: 'IT Support',
  status: 'Active',
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const role: UserRole = 'teamlead';
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const raw = localStorage.getItem('platform_current_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.name?.toLowerCase()?.includes('hyma') || parsed.email?.toLowerCase()?.includes('hyma'))) {
          localStorage.removeItem('platform_current_user');
        } else if (parsed && parsed.email) {
          return {
            id: parsed.id || 'usr-admin-1791203472315',
            name: parsed.name || 'Sudheshna Bharadwaj',
            email: parsed.email,
            phone: parsed.phone || '',
            role: 'teamlead',
            department: parsed.department || 'IT Support',
            status: 'Active',
          };
        }
      }
    } catch {}
    return DEFAULT_USER;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('itsm_teamlead_auth') === 'true';
  });

  const loadUsersFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mappedUsers: User[] = data.map((u: any) => ({
          id: u.id,
          name: u.name || (u.email ? u.email.split('@')[0] : 'User'),
          email: u.email,
          phone: u.phone || '',
          role: (u.role === 'teamlead' ? 'teamlead' : 'employee'),
          department: u.department || 'IT Operations',
          designation: u.designation || 'Team Member',
          team: u.team || '',
          avatar: u.avatar || '',
          location: u.location || '',
          status: (u.status === 'Inactive' ? 'Inactive' : 'Active'),
        }));
        setUsers(mappedUsers);

        // Update currentUser if matched in Supabase
        const currentSessionEmail = currentUser.email.toLowerCase();
        const matched = mappedUsers.find(u => u.email.toLowerCase() === currentSessionEmail);
        if (matched) {
          setCurrentUser(matched);
        } else if (currentUser.email && !['teamlead@company.com', 'admin@company.com'].includes(currentUser.email)) {
          // If current logged-in user isn't in Supabase yet, upsert them so DB has their record
          supabase.from('users').upsert([{
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone || '',
            department: currentUser.department || 'IT Operations',
            role: 'teamlead',
            status: 'Active',
            password: 'Password123'
          }]).then(() => {});
        }
      }
    } catch (e) {
      console.error('Supabase load users error:', e);
    }
  };

  useEffect(() => {
    loadUsersFromSupabase();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      return { success: false, error: 'Please enter both Email and Password.' };
    }

    try {
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (error || !dbUser) {
        return { success: false, error: 'No account found with this email. Please register first.' };
      }

      const validPass = dbUser.password === password || (!dbUser.password && password === 'Password123');
      if (!validPass) {
        return { success: false, error: 'Incorrect password. Please verify your credentials.' };
      }

      const appUser: User = {
        id: dbUser.id,
        name: dbUser.name || cleanEmail.split('@')[0],
        email: dbUser.email,
        phone: dbUser.phone || '',
        role: (dbUser.role === 'teamlead' ? 'teamlead' : 'employee'),
        department: dbUser.department || 'IT Operations',
        status: (dbUser.status === 'Inactive' ? 'Inactive' : 'Active'),
      };

      setCurrentUser(appUser);
      setIsAuthenticated(true);
      localStorage.setItem('itsm_teamlead_auth', 'true');
      localStorage.setItem('platform_current_user', JSON.stringify(appUser));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: 'Unable to connect to database. Please try again.' };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('itsm_teamlead_auth');
    localStorage.removeItem('platform_current_user');
    localStorage.setItem('platform_explicitly_logged_out', 'true');
    window.location.href = '/login';
  };

  const updateUserProfile = (updatedData: Partial<User>) => {
    if (currentUser.id) {
      const dbUpdates: Record<string, any> = {};
      if (updatedData.name) dbUpdates.name = updatedData.name;
      if (updatedData.phone) dbUpdates.phone = updatedData.phone;
      if (updatedData.department) dbUpdates.department = updatedData.department;
      if (updatedData.avatar) dbUpdates.avatar = updatedData.avatar;
      supabase.from('users').update(dbUpdates).eq('id', currentUser.id).then(() => {});
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, ...updatedData } : u))
    );
    setCurrentUser((prev) => ({ ...prev, ...updatedData }));
  };

  const addUser = async (userData: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    department: string;
    role: UserRole;
    status: UserStatus;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const cleanId = userData.id.trim();

    // Check duplicate in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .or(`id.eq.${cleanId},email.eq.${cleanEmail}`)
      .limit(1);

    if (existingUser && existingUser.length > 0) {
      if (existingUser[0].id === cleanId) {
        return { success: false, error: `Employee ID "${cleanId}" already exists.` };
      }
      return { success: false, error: `Email address "${cleanEmail}" already exists.` };
    }

    const inviteToken = (userData as any).invite_token || `inv-${Math.random().toString(36).substring(2, 10)}`;
    const userPassword = (userData as any).password || 'Password123';

    const { error: insErr } = await supabase.from('users').insert([{
      id: cleanId,
      name: userData.name.trim(),
      email: cleanEmail,
      phone: userData.phone || '',
      department: userData.department,
      role: userData.role,
      status: userData.status || 'Pending Invitation',
      password: userPassword,
      invite_token: inviteToken,
      invite_sent_at: new Date().toISOString(),
    }]);

    if (insErr) {
      return { success: false, error: insErr.message };
    }

    // Dispatch invitation notification to backend with custom password and employee portal URL
    try {
      const signupUrl = `http://localhost:4173/signin?email=${encodeURIComponent(cleanEmail)}`;
      await fetch('http://localhost:8000/api/v1/notifications/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userData.name.trim(),
          email: cleanEmail,
          employee_id: cleanId,
          role: 'Employee',
          department: userData.department || 'IT Support',
          invite_token: inviteToken,
          signup_url: signupUrl,
          password: userPassword
        })
      });
    } catch (e) {
      console.warn('Could not dispatch employee invitation notification:', e);
    }

    const newUser: User = {
      ...userData,
      id: cleanId,
      name: userData.name.trim(),
      email: cleanEmail,
      avatar: '',
    };

    setUsers((prev) => [newUser, ...prev]);
    return { success: true, inviteToken } as any;
  };

  const updateUser = async (id: string, data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    const dbUpdates: Record<string, any> = {};
    if (data.name) dbUpdates.name = data.name;
    if (data.email) dbUpdates.email = data.email.trim().toLowerCase();
    if (data.phone) dbUpdates.phone = data.phone;
    if (data.department) dbUpdates.department = data.department;
    if (data.role) dbUpdates.role = data.role;
    if (data.status) dbUpdates.status = data.status;

    const { error } = await supabase.from('users').update(dbUpdates).eq('id', id);
    if (error) {
      return { success: false, error: error.message };
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...data } : u))
    );
    return { success: true };
  };

  const toggleUserStatus = (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    const newStatus: UserStatus = target.status === 'Active' ? 'Inactive' : 'Active';
    supabase.from('users').update({ status: newStatus }).eq('id', id).then(() => {});

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  const deleteUser = (id: string) => {
    supabase.from('users').delete().eq('id', id).then(() => {});
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        users,
        role,
        isAuthenticated,
        login,
        logout,
        updateUserProfile,
        addUser,
        updateUser,
        toggleUserStatus,
        deleteUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
