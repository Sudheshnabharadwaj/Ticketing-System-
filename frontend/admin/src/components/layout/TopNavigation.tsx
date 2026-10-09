import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Bell,
  ChevronDown,
  ShieldCheck,
  LogOut,
  Settings,
  User as UserIcon,
  Key,
  BellRing,
  Menu
} from 'lucide-react';
import { logoutUser, getCurrentSessionUser } from '../../services/unifiedAuth';

export interface NotificationItem {
  id: string;
  title: string;
  time: string;
  type: string;
  isRead?: boolean;
}

interface TopNavigationProps {
  onSearch?: (query: string) => void;
  notifications?: NotificationItem[];
  onMarkAllAsRead?: () => void;
  onToggleMobileSidebar?: () => void;
}

const defaultNotifications: NotificationItem[] = [];

export const TopNavigation: React.FC<TopNavigationProps> = ({
  onSearch,
  notifications: initialNotificationsProp,
  onMarkAllAsRead,
  onToggleMobileSidebar,
}) => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const getSessionProfile = () => {
    // Purge any stale legacy hyma entries
    try {
      const userRaw = localStorage.getItem('platform_current_user');
      if (userRaw && (userRaw.toLowerCase().includes('hyma') || userRaw.toLowerCase().includes('admin@company.com'))) {
        localStorage.removeItem('platform_current_user');
      }
      const cached = localStorage.getItem('admin_profile_data');
      if (cached && (cached.toLowerCase().includes('hyma') || cached.toLowerCase().includes('admin@company.com'))) {
        localStorage.removeItem('admin_profile_data');
        localStorage.removeItem('admin_profile_avatar');
      }
    } catch {}

    const session = getCurrentSessionUser();
    const isTeamLeadPath = typeof window !== 'undefined' && (window.location.pathname.startsWith('/teamlead') || location.pathname.startsWith('/teamlead'));
    const isEmployeePath = typeof window !== 'undefined' && (window.location.pathname.startsWith('/employee') || location.pathname.startsWith('/employee'));
    
    let roleLabel = 'Admin';
    if (isTeamLeadPath) {
      roleLabel = 'Team Lead';
    } else if (isEmployeePath) {
      roleLabel = 'Employee';
    } else if (session?.role === 'teamlead') {
      roleLabel = 'Team Lead';
    } else if (session?.role === 'employee') {
      roleLabel = 'Employee';
    }

    const fallbackName = session?.name || 'Sudheshna Bharadwaj';

    try {
      const cached = localStorage.getItem('admin_profile_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.name && !parsed.name.toLowerCase().includes('hyma')) {
          return {
            name: parsed.name,
            avatarUrl: parsed.avatarUrl || localStorage.getItem('admin_profile_avatar') || '',
            role: roleLabel,
          };
        }
      }
    } catch {}

    return {
      name: fallbackName,
      avatarUrl: localStorage.getItem('admin_profile_avatar') || session?.avatarUrl || '',
      role: roleLabel,
    };
  };

  const [adminProfile, setAdminProfile] = useState<{ name: string; avatarUrl: string; role: string }>(getSessionProfile);

  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialNotificationsProp || defaultNotifications
  );

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkProfile = () => {
      setAdminProfile(getSessionProfile());
    };
    checkProfile();
    window.addEventListener('storage', checkProfile);
    return () => window.removeEventListener('storage', checkProfile);
  }, []);

  const hasUnread = notifications.some((n) => !n.isRead);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    }
  };

  useEffect(() => {
    const handleAddNotification = (e: CustomEvent<NotificationItem> | Event) => {
      const customEvent = e as CustomEvent<NotificationItem>;
      if (customEvent.detail) {
        setNotifications((prev) => [
          {
            ...customEvent.detail,
            isRead: customEvent.detail.isRead ?? false,
          },
          ...prev,
        ]);
      }
    };

    window.addEventListener('add-notification', handleAddNotification as EventListener);
    return () => {
      window.removeEventListener('add-notification', handleAddNotification as EventListener);
    };
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-3 shadow-2xs shrink-0">
      {/* Left: Mobile Hamburger Button & Search */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 lg:hidden cursor-pointer"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search tickets, users, settings..."
            className="w-full bg-slate-100/70 border border-slate-200/80 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 transition-all"
          />
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Add User Quick Action */}
        <button
          onClick={() => navigate('/admin/add-user')}
          className="bg-[#0284C7] hover:bg-[#0369A1] text-white font-medium rounded-lg px-2.5 sm:px-3.5 py-1.5 text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add User</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shrink-0"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0284C7] text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-white">
                3
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">System Notifications</span>
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[10px] text-[#0284C7] font-medium cursor-pointer hover:underline bg-transparent border-0 p-0"
                >
                  Mark all as read
                </button>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors cursor-pointer">
                    <p className="text-xs font-medium text-slate-800">{n.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 pr-2 sm:pr-3 rounded-full bg-white border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-2xs shrink-0"
          >
            {adminProfile.avatarUrl ? (
              <img
                src={adminProfile.avatarUrl}
                alt={adminProfile.name}
                className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#0284C7] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {adminProfile.name.charAt(0)}
              </div>
            )}
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">{adminProfile.name}</div>
              <div className="text-[10px] font-bold text-[#0284C7] flex items-center gap-1 uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3 inline" /> {adminProfile.role}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{adminProfile.name}</p>
                <span className="inline-block mt-0.5 text-[10px] font-bold text-[#0284C7] bg-sky-50 px-2 py-0.5 rounded border border-sky-200 uppercase">
                  {adminProfile.role}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { setShowProfileMenu(false); navigate(adminProfile.role === 'Team Lead' ? '/teamlead/profile' : '/admin/profile'); }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-500" /> My Profile
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/teamlead/dashboard'); }}
                  className="w-full text-left px-4 py-2 text-xs text-sky-700 hover:bg-sky-50 flex items-center gap-2 cursor-pointer font-semibold"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" /> Team Lead Dashboard
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/admin/dashboard'); }}
                  className="w-full text-left px-4 py-2 text-xs text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 cursor-pointer font-semibold"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Admin Dashboard
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/employee/dashboard'); }}
                  className="w-full text-left px-4 py-2 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer font-semibold"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Employee Dashboard
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); navigate('/admin/settings'); }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" /> Account Settings
                </button>
                <button
                  onClick={() => { setShowProfileMenu(false); setShowNotifications(true); }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <BellRing className="w-3.5 h-3.5 text-slate-500" /> Notifications
                </button>
              </div>

              <div className="border-t border-slate-100 my-1" />

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logoutUser();
                  navigate('/signup');
                }}
                className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};


