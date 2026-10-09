import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Ticket,
  Clock,
  User as UserIcon
} from 'lucide-react';
import { EmployeeService } from '../../services/employeeService';
import type { EmployeeProfile, EmployeeNotificationItem } from '../../types';

interface EmployeeTopNavProps {
  onSearch?: (query: string) => void;
  onToggleMobileSidebar?: () => void;
}

export const EmployeeTopNav: React.FC<EmployeeTopNavProps> = ({
  onSearch,
  onToggleMobileSidebar,
}) => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<EmployeeNotificationItem[]>([]);
  const [profile, setProfile] = useState<EmployeeProfile>(EmployeeService.getProfile());

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateLocalState = async () => {
      setProfile(EmployeeService.getProfile());
      const notifs = await EmployeeService.fetchNotifications();
      setNotifications(notifs);
    };
    updateLocalState();
    window.addEventListener('storage', updateLocalState);
    return () => window.removeEventListener('storage', updateLocalState);
  }, []);

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchValue(query);
    if (onSearch) onSearch(query);
  };

  const handleMarkAllAsRead = () => {
    const updated = EmployeeService.markNotificationsAsRead();
    setNotifications(updated);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-3 shadow-2xs shrink-0 font-sans">
      {/* Mobile Hamburger Button */}
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

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search tickets, priority, status..."
            className="w-full bg-slate-100/70 border border-slate-200/80 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shrink-0"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0284C7] text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="text-[10px] text-[#0284C7] font-medium cursor-pointer hover:underline bg-transparent border-0 p-0"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/notifications');
                    }}
                    className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                      !n.isRead ? 'bg-sky-50/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="p-1 rounded bg-sky-100 text-[#0284C7] shrink-0 mt-0.5">
                        <Ticket className="w-3 h-3" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-800 leading-snug">{n.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {n.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-slate-100 text-center bg-slate-50/50">
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/notifications');
                  }}
                  className="text-xs text-[#0284C7] font-semibold hover:underline cursor-pointer"
                >
                  View All Notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Employee Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1 pr-2 sm:pr-3 rounded-full bg-white border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-2xs shrink-0"
          >
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#0284C7] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {profile.name ? profile.name.charAt(0) : 'M'}
              </div>
            )}
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">
                {profile.name}
              </div>
              <div className="text-[10px] font-bold text-[#0284C7] uppercase tracking-wider">
                Employee
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{profile.name}</p>
                <p className="text-[11px] text-slate-500">{profile.email}</p>
                <span className="inline-block mt-1 text-[10px] font-bold text-[#0284C7] bg-sky-50 px-2 py-0.5 rounded border border-sky-200 uppercase">
                  {profile.department}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/profile');
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <UserIcon className="w-3.5 h-3.5 text-slate-500" /> Profile
                </button>
              </div>

              <div className="border-t border-slate-100 my-1" />

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  localStorage.removeItem('platform_current_user');
                  localStorage.setItem('platform_explicitly_logged_out', 'true');
                  navigate('/login');
                }}
                className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
