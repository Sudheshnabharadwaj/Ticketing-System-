import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentSessionUser, UserRoleType } from '../../services/unifiedAuth';

interface ProtectedRouteProps {
  requiredRole?: UserRoleType | UserRoleType[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, children }) => {
  const location = useLocation();
  const [user, setUser] = useState(() => getCurrentSessionUser());

  useEffect(() => {
    const syncUser = () => {
      setUser(getCurrentSessionUser());
    };

    window.addEventListener('platform-auth-changed', syncUser);
    window.addEventListener('session-expired', syncUser);
    window.addEventListener('platform-logout', syncUser);
    window.addEventListener('storage', syncUser);

    // Re-verify immediately on path change / navigation
    syncUser();

    return () => {
      window.removeEventListener('platform-auth-changed', syncUser);
      window.removeEventListener('session-expired', syncUser);
      window.removeEventListener('platform-logout', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, [location.pathname]);

  // If not authenticated, redirect immediately to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If role does not match, redirect to user's respective dashboard (Admins have access to all portals)
  if (requiredRole) {
    const isDirectMatch = Array.isArray(requiredRole) ? requiredRole.includes(user.role) : user.role === requiredRole;
    const allowed = user.role === 'admin' || isDirectMatch;
    if (!allowed) {
      if (user.role === 'teamlead') {
        return <Navigate to="/teamlead/dashboard" replace />;
      }
      if (user.role === 'employee') {
        return <Navigate to="/employee/dashboard" replace />;
      }
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
