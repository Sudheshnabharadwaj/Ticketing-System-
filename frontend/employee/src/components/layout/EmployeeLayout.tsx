import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { EmployeeTopNav } from './EmployeeTopNav';
import { EmployeeSidebar } from './EmployeeSidebar';
import { EmployeeService } from '../../services/employeeService';
import { supabase } from '../../services/supabaseClient';

export const EmployeeLayout: React.FC = () => {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [assignedCount, setAssignedCount] = useState<number>(() => {
    return EmployeeService.getAssignedTickets().length;
  });

  useEffect(() => {
    let cancelled = false;
    const updateAssignedCount = async (force = false) => {
      await EmployeeService.fetchTickets(force);
      if (!cancelled) {
        setAssignedCount(EmployeeService.getAssignedTickets().length);
      }
    };

    updateAssignedCount(false);

    // 1. Supabase Realtime Channel
    const channel = supabase
      .channel('employee-realtime-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        EmployeeService.clearCache();
        void updateAssignedCount(true);
        window.dispatchEvent(new CustomEvent('ticket-updated'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_activities' }, () => {
        EmployeeService.clearCache();
        void updateAssignedCount(true);
        window.dispatchEvent(new CustomEvent('ticket-updated'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_comments' }, () => {
        EmployeeService.clearCache();
        void updateAssignedCount(true);
        window.dispatchEvent(new CustomEvent('ticket-updated'));
      })
      .subscribe();

    // 2. Controlled Polling Fallback (15 seconds, non-destructive background sync)
    const pollInterval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void updateAssignedCount(false);
      }
    }, 15000);

    const onLocalUpdated = () => {
      void updateAssignedCount(false);
    };
    window.addEventListener('ticket-updated', onLocalUpdated);
    window.addEventListener('storage', onLocalUpdated);

    return () => {
      cancelled = true;
      window.clearInterval(pollInterval);
      window.removeEventListener('ticket-updated', onLocalUpdated);
      window.removeEventListener('storage', onLocalUpdated);
      try {
        supabase.removeChannel(channel);
      } catch {
        // channel unsubscribe fallback
      }
    };
  }, []);

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-900 flex overflow-hidden font-sans">
      {/* Sidebar (Dark Navy #0F172A continuous panel) */}
      <EmployeeSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        assignedCount={assignedCount}
      />

      {/* Main Container (Top Navigation + Scrollable Page Content) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <EmployeeTopNav
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          onSearch={(query) => {
            navigate(`/employee/tickets?search=${encodeURIComponent(query)}`);
          }}
        />

        {/* Dynamic Page Content Area */}
        <main className="flex-1 bg-[#F8FAFC] overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
