import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { UserAvatar } from '../common/UserAvatar';
import {
  LayoutDashboard,
  Ticket,
  UserCheck,
  Users,
  AlertTriangle,
  BookOpen,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  TicketCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTickets } from '../../hooks/useTickets';
import { APP_NAME } from '../../utils/constants';
import { LogoutConfirmModal } from '../common/LogoutConfirmModal';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const { user, logout } = useAuth();
  const { tickets } = useTickets();
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogoutConfirm = () => {
    setIsLogoutModalOpen(false);
    logout();
    navigate('/signup');
  };

  const assignedCount = (tickets || []).filter(
    (t) =>
      (t.assignedAgent && user?.name && t.assignedAgent.toLowerCase() === user.name.toLowerCase()) ||
      (t.assignedAgentId && user?.id && t.assignedAgentId === user.id) ||
      t.handledBy === 'teamlead' ||
      t.assignedToType === 'teamlead'
  ).length;

  const teamLeadNav = [
    { label: 'Dashboard', path: '/teamlead/dashboard', icon: LayoutDashboard },
    { label: 'Team Tickets', path: '/teamlead/team-tickets', icon: Ticket },
    { label: 'Assigned Tickets', path: '/teamlead/assigned-tickets', icon: UserCheck, badge: assignedCount },
    { label: 'My Tickets', path: '/teamlead/my-tickets', icon: TicketCheck },
    { label: 'Employees', path: '/teamlead/employees', icon: Users },
    { label: 'Escalations', path: '/teamlead/escalations', icon: AlertTriangle },
    { label: 'Knowledge Base', path: '/teamlead/knowledge-base', icon: BookOpen },
    { label: 'Profile', path: '/teamlead/profile', icon: User },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Dark Navy Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-[#0F172A] border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 h-full shadow-2xl transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          collapsed && !mobileOpen ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Header Branding */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-[#0F172A] shrink-0">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-[#0284C7] flex items-center justify-center text-white shadow-xs shrink-0">
                <Ticket className="w-4 h-4" />
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white tracking-tight leading-none block">{APP_NAME}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-950/80 text-[#38BDF8] border border-sky-800/60 uppercase">
                      Team Lead
                    </span>
                  </div>
                  <span className="block text-[9px] text-[#38BDF8] font-bold uppercase tracking-wider mt-0.5">
                    IT SERVICE MANAGEMENT
                  </span>
                </div>
              )}
            </div>

            {/* Collapse Button Desktop */}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 mt-1 overflow-y-auto flex-1">
            {teamLeadNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all group ${
                      isActive
                        ? 'bg-[#0284C7] text-white font-medium shadow-2xs'
                        : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                    {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                  </div>
                  {(!collapsed || mobileOpen) && item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 text-slate-400 text-xs bg-[#0F172A] shrink-0">
          {(!collapsed || mobileOpen) ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <UserAvatar name={user.name} avatar={user.avatar} size="md" />
                <div className="truncate">
                  <p className="font-semibold text-white leading-tight truncate text-xs">{user.name}</p>
                  <p className="text-[10px] text-[#38BDF8] font-semibold truncate tracking-wider">TEAM LEAD</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsLogoutModalOpen(true)}
              className="w-full flex justify-center p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Logout Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
};
