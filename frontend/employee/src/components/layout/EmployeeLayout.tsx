import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { EmployeeTopNav } from './EmployeeTopNav';
import { EmployeeSidebar } from './EmployeeSidebar';

export const EmployeeLayout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-900 flex overflow-hidden font-sans">
      {/* Sidebar (Dark Navy #0F172A continuous panel) */}
      <EmployeeSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container (Top Navigation + Scrollable Page Content) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <EmployeeTopNav
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
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
