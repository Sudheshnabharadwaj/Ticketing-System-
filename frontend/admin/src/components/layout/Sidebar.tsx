import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  Users,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  Kanban,
  UserCheck,
  X
} from 'lucide-react';

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  badge?: number | string;
  badgeVariant?: 'amber' | 'rose' | 'indigo' | 'slate';
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Overview: true,
    Workspace: true,
    Administration: true,
  });

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
  };

  const navGroups: NavGroup[] = [
    {
      groupTitle: 'Overview',
      items: [
        {
          title: 'Admin Dashboard',
          path: '/admin/dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />
        }
      ]
    },
    {
      groupTitle: 'Workspace',
      items: [
        {
          title: 'All Tickets',
          path: '/admin/workspace/all',
          icon: <Ticket className="w-4 h-4" />
        },
        {
          title: 'My Tickets',
          path: '/admin/workspace/my-tickets',
          icon: <UserCheck className="w-4 h-4" />
        },
        {
          title: 'Ticket Management',
          path: '/admin/workspace/management',
          icon: <Kanban className="w-4 h-4" />
        },
        {
          title: 'Escalated Tickets',
          path: '/admin/workspace/escalated',
          icon: <AlertTriangle className="w-4 h-4" />,
          badge: 8,
          badgeVariant: 'amber'
        },
        {
          title: 'SLA Risk',
          path: '/admin/workspace/sla-risk',
          icon: <Clock className="w-4 h-4" />,
          badge: 5,
          badgeVariant: 'amber'
        },
        {
          title: 'SLA Breached',
          path: '/admin/workspace/sla-breached',
          icon: <AlertTriangle className="w-4 h-4" />,
          badge: 3,
          badgeVariant: 'rose'
        }
      ]
    },
    {
      groupTitle: 'Administration',
      items: [
        {
          title: 'User Management',
          path: '/admin/administration/users',
          icon: <Users className="w-4 h-4" />
        },
        {
          title: 'Roles & Permissions',
          path: '/admin/administration/roles',
          icon: <ShieldCheck className="w-4 h-4" />
        }
      ]
    }
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

      {/* Dark Navy Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] border-r border-slate-800 text-slate-300 flex flex-col shrink-0 h-full shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding Section (Continuous Dark Navy #0F172A) */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#0F172A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0284C7] flex items-center justify-center text-white shadow-xs shrink-0">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-bold text-white tracking-tight leading-none m-0">Ticketing Portal</h1>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-950/80 text-[#38BDF8] border border-sky-800/60 uppercase">
                  Admin
                </span>
              </div>
              <p className="text-[9px] text-[#38BDF8] font-bold uppercase tracking-wider block mt-0.5 m-0">Enterprise Management</p>
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

        {/* Navigation Sections */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {navGroups.map((group) => {
            const isGroupOpen = openGroups[group.groupTitle];

            return (
              <div key={group.groupTitle} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.groupTitle)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <span>{group.groupTitle}</span>
                  {isGroupOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                {isGroupOpen && (
                  <div className="space-y-1 mt-1">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.path ||
                        (item.path === '/admin/dashboard' && (location.pathname === '/admin' || location.pathname === '/admin/'));

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
                            <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}>
                              {item.icon}
                            </span>
                            <span>{item.title}</span>
                          </div>

                          {item.badge !== undefined && (
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                item.badgeVariant === 'rose'
                                  ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                  : item.badgeVariant === 'amber'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};


