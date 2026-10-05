import React from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentSessionUser, UserRoleType } from '../../services/unifiedAuth';

interface ProtectedRouteProps {
  requiredRole?: UserRoleType | UserRoleType[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, children }) => {
  const user = getCurrentSessionUser();

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If role does not match, redirect to user's respective dashboard
  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole.includes(user.role) : user.role === requiredRole;
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
