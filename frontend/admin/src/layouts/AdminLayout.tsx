import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { TopNavigation } from '../components/layout/TopNavigation';
import { Sidebar } from '../components/layout/Sidebar';
import { supabase } from '../services/supabaseClient';
import { AdminApiService } from '../services/api';

export const AdminLayout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const notifyUpdate = () => {
      window.dispatchEvent(new CustomEvent('ticket-updated'));
    };

    // 1. Supabase Realtime Channel
    const channel = supabase
      .channel('admin-realtime-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        AdminApiService.invalidateCache();
        notifyUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_activities' }, () => {
        AdminApiService.invalidateCache();
        notifyUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_comments' }, () => {
        AdminApiService.invalidateCache();
        notifyUpdate();
      })
      .subscribe();

    // 2. Controlled Polling Fallback (15 seconds, non-destructive background sync)
    const pollInterval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        notifyUpdate();
      }
    }, 15000);

    return () => {
      window.clearInterval(pollInterval);
      try {
        supabase.removeChannel(channel);
      } catch {
        // channel unsubscribe fallback
      }
    };
  }, []);

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-900 flex overflow-hidden font-sans">
      {/* Sidebar (Dark Navy #0F172A continuous panel for Desktop + Mobile Drawer) */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container (Top Navigation + Scrollable Page Content) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <TopNavigation
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          onSearch={(query) => {
            navigate(`/admin/workspace/all?search=${encodeURIComponent(query)}`);
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

