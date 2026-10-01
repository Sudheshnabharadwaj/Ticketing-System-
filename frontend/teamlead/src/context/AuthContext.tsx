import React, { createContext, useState } from 'react';
import { User, UserRole, UserStatus } from '../types/user';
import { mockUsers } from '../mock/users';

interface AuthContextType {
  user: User;
  users: User[];
  role: UserRole;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
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
  }) => { success: boolean; error?: string };
  updateUser: (id: string, data: Partial<User>) => { success: boolean; error?: string };
  toggleUserStatus: (id: string) => void;
  deleteUser: (id: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const role: UserRole = 'teamlead';
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [currentUser, setCurrentUser] = useState<User>(
    mockUsers.find((u) => u.role === 'teamlead') || mockUsers[0]
  );

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('itsm_teamlead_auth') === 'true';
  });

  const login = (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      return { success: false, error: 'Please enter both Email and Password.' };
    }
    setIsAuthenticated(true);
    localStorage.setItem('itsm_teamlead_auth', 'true');
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('itsm_teamlead_auth');
    localStorage.removeItem('platform_current_user');
    localStorage.setItem('platform_explicitly_logged_out', 'true');
    window.location.href = '/login';
  };

  const updateUserProfile = (updatedData: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, ...updatedData } : u))
    );
    setCurrentUser((prev) => ({ ...prev, ...updatedData }));
  };

  const addUser = (userData: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    department: string;
    role: UserRole;
    status: UserStatus;
  }) => {
    // Duplicate Employee ID check
    const duplicateId = users.some(
      (u) => u.id.trim().toLowerCase() === userData.id.trim().toLowerCase()
    );
    if (duplicateId) {
      return { success: false, error: `Employee ID "${userData.id}" already exists.` };
    }

    // Duplicate Email check
    const duplicateEmail = users.some(
      (u) => u.email.trim().toLowerCase() === userData.email.trim().toLowerCase()
    );
    if (duplicateEmail) {
      return { success: false, error: `Email address "${userData.email}" already exists.` };
    }

    const newUser: User = {
      ...userData,
      id: userData.id.trim(),
      name: userData.name.trim(),
      email: userData.email.trim(),
      avatar: '',
    };

    setUsers((prev) => [newUser, ...prev]);
    return { success: true };
  };

  const updateUser = (id: string, data: Partial<User>) => {
    if (data.email) {
      const duplicateEmail = users.some(
        (u) => u.id !== id && u.email.trim().toLowerCase() === data.email?.trim().toLowerCase()
      );
      if (duplicateEmail) {
        return { success: false, error: `Email address "${data.email}" is already used by another employee.` };
      }
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...data } : u))
    );
    return { success: true };
  };

  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const newStatus: UserStatus = u.status === 'Active' ? 'Inactive' : 'Active';
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  const deleteUser = (id: string) => {
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
