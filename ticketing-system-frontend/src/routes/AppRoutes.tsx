import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { TeamLeadLayout } from '../layouts/TeamLeadLayout';

import { Login } from '../pages/Login';

// Team Lead Pages
import { TeamLeadDashboard } from '../pages/teamlead/TeamLeadDashboard';
import { TeamTickets } from '../pages/teamlead/TeamTickets';
import { AssignedTickets } from '../pages/teamlead/AssignedTickets';
import { MyTickets } from '../pages/teamlead/MyTickets';
import { Employees } from '../pages/teamlead/Employees';
import { Escalations } from '../pages/teamlead/Escalations';
import { Reports } from '../pages/teamlead/Reports';
import { KnowledgeBase as TeamLeadKB } from '../pages/teamlead/KnowledgeBase';
import { TeamLeadProfile } from '../pages/teamlead/TeamLeadProfile';

import { TicketDetailsPage } from '../pages/teamlead/TicketDetailsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Root Redirect to Team Lead Dashboard */}
      <Route path="/" element={<Navigate to="/teamlead/dashboard" replace />} />

      {/* Team Lead Routes */}
      <Route
        path="/teamlead"
        element={
          <ProtectedRoute>
            <TeamLeadLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/teamlead/dashboard" replace />} />
        <Route path="dashboard" element={<TeamLeadDashboard />} />
        <Route path="team-tickets" element={<TeamTickets />} />
        <Route path="assigned-tickets" element={<AssignedTickets />} />
        <Route path="assigned-tickets/:ticketId" element={<TicketDetailsPage />} />
        <Route path="tickets/:ticketId" element={<TicketDetailsPage />} />
        <Route path="my-tickets" element={<MyTickets />} />
        <Route path="employees" element={<Employees />} />
        <Route path="escalations" element={<Escalations />} />
        <Route path="reports" element={<Reports />} />
        <Route path="knowledge-base" element={<TeamLeadKB />} />
        <Route path="profile" element={<TeamLeadProfile />} />
      </Route>

      {/* Wildcard Fallback */}
      <Route path="*" element={<Navigate to="/teamlead/dashboard" replace />} />
    </Routes>
  );
};
