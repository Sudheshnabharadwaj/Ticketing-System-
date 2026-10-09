import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { EmployeeLayout } from '../components/layout/EmployeeLayout';
import { EmployeeSignIn } from '../pages/EmployeeSignIn';
import { EmployeeSignUp } from '../pages/EmployeeSignUp';
import { ForgotPassword } from '../pages/ForgotPassword';
import { ResetPassword } from '../pages/ResetPassword';
import { EmployeeDashboard } from '../pages/EmployeeDashboard';
import { MyTickets } from '../pages/MyTickets';
import { AssignedTickets } from '../pages/AssignedTickets';
import { AssignedTicketDetails } from '../pages/AssignedTicketDetails';
import { CreateTicket } from '../pages/CreateTicket';
import { KnowledgeBase } from '../pages/KnowledgeBase';
import { Notifications } from '../pages/Notifications';
import { Profile } from '../pages/Profile';

const isEmployeeAuthenticated = (): boolean => {
  try {
    const raw = localStorage.getItem('platform_current_user');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!(parsed && parsed.email);
  } catch {
    return false;
  }
};

const EmployeeProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isEmployeeAuthenticated()) {
    return <Navigate to="/signin" replace />;
  }
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  const auth = isEmployeeAuthenticated();

  return (
    <Routes>
      {/* Root Route: localhost URL opens Sign Up page for unauthenticated users */}
      <Route
        path="/"
        element={auth ? <Navigate to="/dashboard" replace /> : <Navigate to="/signup" replace />}
      />

      {/* 1. Employee Auth Routes */}
      <Route path="/signin" element={<EmployeeSignIn />} />
      <Route path="/login" element={<Navigate to="/signin" replace />} />
      <Route path="/signup" element={<EmployeeSignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* 2. Employee Main Portal Layout with Protected Sub-routes */}
      <Route
        element={
          <EmployeeProtectedRoute>
            <EmployeeLayout />
          </EmployeeProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<EmployeeDashboard />} />
        <Route path="/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/tickets" element={<MyTickets />} />
        <Route path="/tickets/:id" element={<AssignedTicketDetails />} />
        <Route path="/assigned-tickets" element={<AssignedTickets />} />
        <Route path="/assigned-tickets/:id" element={<AssignedTicketDetails />} />
        <Route path="/create-ticket" element={<CreateTicket />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Default Route */}
      <Route
        path="*"
        element={auth ? <Navigate to="/dashboard" replace /> : <Navigate to="/signup" replace />}
      />
    </Routes>
  );
};

