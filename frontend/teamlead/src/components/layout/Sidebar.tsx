import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { UserAvatar } from '../common/UserAvatar';
import {
  LayoutDashboard,
  Ticket,
  UserCheck,
  Users,
  AlertTriangle,
  BarChart3,
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
    navigate('/login');
  };

  const assignedCount = tickets.filter(
    (t) => t.handledBy === 'teamlead' || t.assignedToType === 'teamlead' || t.assignedAgent === 'Alex Morgan'
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

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-slate-900 text-white flex flex-col justify-between transition-all duration-300 shadow-xl border-r border-slate-800/80 ${
          collapsed ? 'lg:w-20' : 'lg:w-64'
        } ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div>
          {/* Header Branding */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="p-2 bg-sky-600 rounded-xl text-white shadow-md shrink-0 flex items-center justify-center">
                <Ticket className="w-5 h-5" />
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="truncate">
                  <span className="font-bold text-base text-white tracking-tight leading-none block">{APP_NAME}</span>
                  <span className="block text-[9px] text-sky-400 font-bold uppercase tracking-widest mt-0.5">
                    IT SERVICE MANAGEMENT
                  </span>
                </div>
              )}
            </div>

            {/* Collapse Button Desktop */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 mt-2">
            {teamLeadNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-sky-600 text-white font-semibold shadow-md shadow-sky-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110 text-sky-400 group-[.bg-sky-600]:text-white" />
                    {(!collapsed || mobileOpen) && <span className="truncate">{item.label}</span>}
                  </div>
                  {(!collapsed || mobileOpen) && item.badge !== undefined && item.badge > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-500/30 text-sky-200 border border-sky-400/30">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3.5 border-t border-slate-800/80 text-slate-400 text-xs">
          {(!collapsed || mobileOpen) ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <UserAvatar name={user.name} avatar={user.avatar} size="md" />
                <div className="truncate">
                  <p className="font-semibold text-white leading-tight truncate text-xs">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.role.toUpperCase()}</p>
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
              <LogOut className="w-5 h-5" />
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
