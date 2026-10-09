import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Admin Layout & Pages
import { AdminLayout } from '../layouts/AdminLayout';
import { DashboardPage as AdminDashboardPage } from '../pages/DashboardPage';
import { AddUserPage } from '../pages/AddUserPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { SignupPage } from '../pages/auth/SignupPage';
import { AdminSignUpPage } from '../pages/auth/AdminSignUpPage';
import { TeamLeadSignUpPage } from '../pages/auth/TeamLeadSignUpPage';
import { EmployeeSignUpPage } from '../pages/auth/EmployeeSignUpPage';
import { KindOfWorkPage } from '../pages/auth/KindOfWorkPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AllTicketsPage } from '../pages/workspace/AllTicketsPage';
import { TicketManagementPage } from '../pages/workspace/TicketManagementPage';
import { EscalatedTicketsPage } from '../pages/workspace/EscalatedTicketsPage';
import { SLARiskPage } from '../pages/workspace/SLARiskPage';
import { SLABreachedPage } from '../pages/workspace/SLABreachedPage';
import { AdminTicketDetailsPage } from '../pages/workspace/AdminTicketDetailsPage';
import { UserManagementPage } from '../pages/administration/UserManagementPage';
import { RolesPermissionsPage } from '../pages/administration/RolesPermissionsPage';
import { TicketConfigPage } from '../pages/administration/TicketConfigPage';
import { WorkflowSettingsPage } from '../pages/administration/WorkflowSettingsPage';
import { SecuritySettingsPage } from '../pages/administration/SecuritySettingsPage';
import { AdminSettingsPage } from '../pages/administration/AdminSettingsPage';
import { ProfilePage as AdminProfilePage } from '../pages/ProfilePage';
import { MyTicketsPage as AdminMyTicketsPage } from '../pages/workspace/MyTicketsPage';

// Employee Layout & Pages (from sibling employee project)
import { EmployeeLayout } from '../../../employee/src/components/layout/EmployeeLayout';
import { EmployeeDashboard } from '../../../employee/src/pages/EmployeeDashboard';
import { MyTickets as EmployeeMyTickets } from '../../../employee/src/pages/MyTickets';
import { AssignedTickets as EmployeeAssignedTickets } from '../../../employee/src/pages/AssignedTickets';
import { AssignedTicketDetails } from '../../../employee/src/pages/AssignedTicketDetails';
import { CreateTicket } from '../../../employee/src/pages/CreateTicket';
import { KnowledgeBase as EmployeeKB } from '../../../employee/src/pages/KnowledgeBase';
import { Notifications as EmployeeNotifications } from '../../../employee/src/pages/Notifications';
import { Profile as EmployeeProfile } from '../../../employee/src/pages/Profile';

// Team Lead Layout & Pages & Context (from sibling teamlead project)
import { TeamLeadLayout } from '../../../teamlead/src/layouts/TeamLeadLayout';
import { AuthProvider as TeamLeadAuthProvider } from '../../../teamlead/src/context/AuthContext';
import { TicketProvider as TeamLeadTicketProvider } from '../../../teamlead/src/context/TicketContext';
import { TeamLeadDashboard } from '../../../teamlead/src/pages/teamlead/TeamLeadDashboard';
import { TeamTickets } from '../../../teamlead/src/pages/teamlead/TeamTickets';
import { AssignedTickets as TeamLeadAssignedTickets } from '../../../teamlead/src/pages/teamlead/AssignedTickets';
import { TicketDetailsPage as TeamLeadTicketDetails } from '../../../teamlead/src/pages/teamlead/TicketDetailsPage';
import { MyTickets as TeamLeadMyTickets } from '../../../teamlead/src/pages/teamlead/MyTickets';
import { Employees } from '../../../teamlead/src/pages/teamlead/Employees';
import { Escalations } from '../../../teamlead/src/pages/teamlead/Escalations';
import { Reports } from '../../../teamlead/src/pages/teamlead/Reports';
import { KnowledgeBase as TeamLeadKB } from '../../../teamlead/src/pages/teamlead/KnowledgeBase';
import { TeamLeadProfile } from '../../../teamlead/src/pages/teamlead/TeamLeadProfile';

import { getCurrentSessionUser } from '../services/unifiedAuth';

/**
 * Root Landing Route:
 * When an unauthenticated user opens the localhost URL (/),
 * the first page MUST be the Sign Up / Registration page (/signup).
 * If already authenticated, redirect to their role-specific dashboard.
 */
const RootRedirect: React.FC = () => {
  return <Navigate to="/signup" replace />;
};


/**
 * Direct Dashboard Route (/dashboard):
 * If unauthenticated, redirect to the Login page (/login).
 * If authenticated, redirect to their role-specific dashboard.
 */
const DashboardRedirect: React.FC = () => {
  const user = getCurrentSessionUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'teamlead') {
    return <Navigate to="/teamlead/dashboard" replace />;
  }
  if (user.role === 'employee') {
    return <Navigate to="/employee/dashboard" replace />;
  }
  return <Navigate to="/admin/dashboard" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root: localhost URL opens Sign Up page for unauthenticated users */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/dashboard" element={<DashboardRedirect />} />

      {/* Unified Login & Portal Login Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signin" element={<Navigate to="/login" replace />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />
      <Route path="/admin/auth/login" element={<Navigate to="/login" replace />} />
      <Route path="/teamlead/login" element={<Navigate to="/login" replace />} />
      <Route path="/teamlead/auth/login" element={<Navigate to="/login" replace />} />
      <Route path="/employee/login" element={<Navigate to="/login" replace />} />
      <Route path="/employee/auth/login" element={<Navigate to="/login" replace />} />
      <Route path="/kind-of-work" element={<KindOfWorkPage />} />

      {/* Multi-Portal Sign-Up & Registration Routes */}
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/register" element={<SignupPage />} />
      <Route path="/admin/signup" element={<AdminSignUpPage />} />
      <Route path="/admin/auth/signup" element={<AdminSignUpPage />} />
      <Route path="/admin/register" element={<AdminSignUpPage />} />
      <Route path="/teamlead/signup" element={<TeamLeadSignUpPage />} />
      <Route path="/teamlead/auth/signup" element={<TeamLeadSignUpPage />} />
      <Route path="/teamlead/register" element={<TeamLeadSignUpPage />} />
      <Route path="/employee/signup" element={<EmployeeSignUpPage />} />
      <Route path="/employee/auth/signup" element={<EmployeeSignUpPage />} />
      <Route path="/employee/register" element={<EmployeeSignUpPage />} />
      <Route path="/admin/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/admin/auth/reset-password" element={<ResetPasswordPage />} />

      {/* Admin Protected Layout Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="profile" element={<AdminProfilePage />} />
        <Route path="add-user" element={<AddUserPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />

        {/* Workspace Sub-routes */}
        <Route path="workspace/all" element={<AllTicketsPage />} />
        <Route path="workspace/my-tickets" element={<AdminMyTicketsPage />} />
        <Route path="workspace/tickets/:id" element={<AdminTicketDetailsPage />} />
        <Route path="workspace/management" element={<TicketManagementPage />} />
        <Route path="workspace/escalated" element={<EscalatedTicketsPage />} />
        <Route path="workspace/sla-risk" element={<SLARiskPage />} />
        <Route path="workspace/sla-breached" element={<SLABreachedPage />} />

        {/* Administration Sub-routes */}
        <Route path="administration/users" element={<UserManagementPage />} />
        <Route path="administration/roles" element={<RolesPermissionsPage />} />
        <Route path="administration/ticket-config" element={<TicketConfigPage />} />
        <Route path="administration/workflows" element={<WorkflowSettingsPage />} />
        <Route path="administration/security" element={<SecuritySettingsPage />} />
      </Route>

      {/* Employee Protected Layout Routes (namespaced /employee/*) */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute requiredRole="employee">
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/employee/dashboard" replace />} />
        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="knowledge-base" element={<EmployeeKB />} />
        <Route path="tickets" element={<EmployeeMyTickets />} />
        <Route path="tickets/:id" element={<AssignedTicketDetails />} />
        <Route path="assigned-tickets" element={<EmployeeAssignedTickets />} />
        <Route path="assigned-tickets/:id" element={<AssignedTicketDetails />} />
        <Route path="create-ticket" element={<CreateTicket />} />
        <Route path="notifications" element={<EmployeeNotifications />} />
        <Route path="profile" element={<EmployeeProfile />} />
      </Route>

      {/* Employee Direct Compatibility Routes */}
      <Route
        element={
          <ProtectedRoute requiredRole="employee">
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/knowledge-base" element={<EmployeeKB />} />
        <Route path="/tickets" element={<EmployeeMyTickets />} />
        <Route path="/tickets/:id" element={<AssignedTicketDetails />} />
        <Route path="/assigned-tickets" element={<EmployeeAssignedTickets />} />
        <Route path="/assigned-tickets/:id" element={<AssignedTicketDetails />} />
        <Route path="/create-ticket" element={<CreateTicket />} />
        <Route path="/notifications" element={<EmployeeNotifications />} />
        <Route path="/profile" element={<EmployeeProfile />} />
      </Route>

      {/* Team Lead Protected Layout Routes */}
      <Route
        path="/teamlead"
        element={
          <ProtectedRoute requiredRole="teamlead">
            <TeamLeadAuthProvider>
              <TeamLeadTicketProvider>
                <TeamLeadLayout />
              </TeamLeadTicketProvider>
            </TeamLeadAuthProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/teamlead/dashboard" replace />} />
        <Route path="dashboard" element={<TeamLeadDashboard />} />
        <Route path="team-tickets" element={<TeamTickets />} />
        <Route path="assigned-tickets" element={<TeamLeadAssignedTickets />} />
        <Route path="assigned-tickets/:ticketId" element={<TeamLeadTicketDetails />} />
        <Route path="tickets/:ticketId" element={<TeamLeadTicketDetails />} />
        <Route path="my-tickets" element={<TeamLeadMyTickets />} />
        <Route path="employees" element={<Employees />} />
        <Route path="escalations" element={<Escalations />} />
        <Route path="reports" element={<Reports />} />
        <Route path="knowledge-base" element={<TeamLeadKB />} />
        <Route path="profile" element={<TeamLeadProfile />} />
      </Route>

      {/* Fallback Catch-all Route */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};
