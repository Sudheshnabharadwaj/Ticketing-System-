import React, { useState, useEffect } from 'react';
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
import { AdminApiService } from '../../services/api';
import kivoLogo from '../../assets/kivo-logo.png';

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

  const [stats, setStats] = useState<{ escalated: number; slaRisk: number; slaBreached: number }>({
    escalated: 0,
    slaRisk: 0,
    slaBreached: 0,
  });

  const fetchStats = () => {
    AdminApiService.getDashboardStats()
      .then((data) => {
        if (!data) return;
        setStats({
          escalated: data.escalatedTickets ?? 0,
          slaRisk: data.slaRiskCount ?? 0,
          slaBreached: data.slaBreachedCount ?? 0,
        });
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStats();
    window.addEventListener('ticket-updated', fetchStats);
    window.addEventListener('storage', fetchStats);
    return () => {
      window.removeEventListener('ticket-updated', fetchStats);
      window.removeEventListener('storage', fetchStats);
    };
  }, []);

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
          badge: stats.escalated,
          badgeVariant: 'amber',
        },
        {
          title: 'SLA Risk',
          path: '/admin/workspace/sla-risk',
          icon: <Clock className="w-4 h-4" />,
          badge: stats.slaRisk,
          badgeVariant: 'amber',
        },
        {
          title: 'SLA Breached',
          path: '/admin/workspace/sla-breached',
          icon: <AlertTriangle className="w-4 h-4" />,
          badge: stats.slaBreached,
          badgeVariant: 'rose',
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
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-[76px] flex items-center justify-center shrink-0 overflow-hidden">
              <img src={kivoLogo} alt="KIVO" className="w-full h-full object-contain" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-bold text-white tracking-tight leading-none m-0">KIVO</h1>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-950/80 text-[#38BDF8] border border-sky-800/60 uppercase">
                  Admin
                </span>
              </div>
              <p className="text-[9px] text-[#38BDF8] font-bold uppercase tracking-wider block mt-0.5 m-0">Track. Manage. Resolve.</p>
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
                              className={`w-5 h-5 flex items-center justify-center text-[10.5px] font-bold rounded-full border shrink-0 ${
                                item.badgeVariant === 'rose'
                                  ? 'bg-[#3A1016] text-[#F87171] border-[#7F1D1D]'
                                  : item.badgeVariant === 'amber'
                                  ? 'bg-[#372309] text-[#FBBF24] border-[#78350F]'
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


