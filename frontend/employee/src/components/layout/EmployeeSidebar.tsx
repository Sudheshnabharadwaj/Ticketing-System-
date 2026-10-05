import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  UserCheck,
  User,
  LogOut,
  X,
  BookOpen
} from 'lucide-react';

interface EmployeeSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  assignedCount?: number;
}

export const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({
  isOpen = false,
  onClose,
  assignedCount = 3,
}) => {
  const location = useLocation();

  const navItems = [
    {
      title: 'Employee Dashboard',
      path: '/employee/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      title: 'Knowledge Base',
      path: '/knowledge-base',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      title: 'Assigned Tickets',
      path: '/assigned-tickets',
      icon: <UserCheck className="w-4 h-4" />,
      badge: assignedCount,
    },
    {
      title: 'My Tickets',
      path: '/tickets',
      icon: <Ticket className="w-4 h-4" />,
    },
    {
      title: 'Profile',
      path: '/profile',
      icon: <User className="w-4 h-4" />,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Dark Navy Sidebar Container (#0F172A exact theme match) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] border-r border-slate-800 text-slate-300 flex flex-col shrink-0 h-full shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding Section */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#0F172A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0284C7] flex items-center justify-center text-white shadow-xs shrink-0">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-bold text-white tracking-tight leading-none m-0">
                  Ticketing Portal
                </h1>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-950/80 text-[#38BDF8] border border-sky-800/60 uppercase">
                  Employee
                </span>
              </div>
              <p className="text-[9px] text-[#38BDF8] font-bold uppercase tracking-wider block mt-0.5 m-0">
                Self Service & Assigned Work
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 cursor-pointer"
              title="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="p-4 space-y-1 flex-1 overflow-y-auto">
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Navigation
          </div>

          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path === '/employee/dashboard' &&
                (location.pathname === '/employee/dashboard' ||
                 location.pathname === '/employee' ||
                 location.pathname === '/employee/' ||
                 location.pathname === '/dashboard'));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (onClose) onClose();
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-all group ${
                  isActive
                    ? 'bg-[#0284C7] text-white font-medium shadow-2xs'
                    : 'text-slate-400 hover:text-white hover:bg-[#1E293B]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }
                  >
                    {item.icon}
                  </span>
                  <span>{item.title}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      isActive
                        ? 'bg-white/20 text-white border-white/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom Sign Out */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0B1120]">
          <NavLink
            to="/signin"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </NavLink>
        </div>
      </aside>
    </>
  );
};
