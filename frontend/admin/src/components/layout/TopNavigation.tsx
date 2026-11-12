import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UserPlus,
  Bell,
  ChevronDown,
  ShieldCheck,
  LogOut,
  BellRing,
  Menu,
  User as UserIcon
} from 'lucide-react';
import { logoutUser, getCurrentSessionUser } from '../../services/unifiedAuth';
import { apiRequest, apiRequestSafe } from '../../services/backendAuth';

export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  time: string;
  type: string;
  isRead?: boolean;
  ticketId?: string;
}

interface TopNavigationProps {
  onSearch?: (query: string) => void;
  notifications?: NotificationItem[];
  onMarkAllAsRead?: () => void;
  onToggleMobileSidebar?: () => void;
}

const defaultNotifications: NotificationItem[] = [];

export const TopNavigation: React.FC<TopNavigationProps> = ({
  onSearch: _onSearch,
  notifications: initialNotificationsProp,
  onMarkAllAsRead,
  onToggleMobileSidebar,
}) => {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const getSessionProfile = () => {
    // Purge any stale legacy hyma entries
    try {
      const userRaw = sessionStorage.getItem('platform_current_user') || localStorage.getItem('platform_current_user');
      if (userRaw && (userRaw.toLowerCase().includes('hyma') || userRaw.toLowerCase().includes('admin@company.com'))) {
        sessionStorage.removeItem('platform_current_user');
        localStorage.removeItem('platform_current_user');
      }
      const cached = sessionStorage.getItem('admin_profile_data') || localStorage.getItem('admin_profile_data');
      if (cached && (cached.toLowerCase().includes('hyma') || cached.toLowerCase().includes('admin@company.com'))) {
        sessionStorage.removeItem('admin_profile_data');
        sessionStorage.removeItem('admin_profile_avatar');
        localStorage.removeItem('admin_profile_data');
        localStorage.removeItem('admin_profile_avatar');
      }
    } catch {}

    const session = getCurrentSessionUser();
    const roleLabel =
      session?.role === 'admin'
        ? 'Admin'
        : session?.role === 'teamlead'
        ? 'Team Lead'
        : session?.role === 'employee'
        ? 'Employee'
        : '';

    if (session && session.name) {
      return {
        name: session.name,
        avatarUrl: session.avatarUrl || '',
        role: roleLabel,
      };
    }

    return {
      name: '',
      avatarUrl: '',
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

  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch persisted, per-recipient notifications from the backend.
  useEffect(() => {
    let cancelled = false;

    const fetchAdminNotifications = async () => {
      const result = await apiRequestSafe<any[]>('/notifications?limit=20');
      if (cancelled) return;
      if (result.error || !Array.isArray(result.data)) {
        // Keep the last known list, but never display a fabricated badge.
        React.startTransition(() => {
          setUnreadCount(0);
        });
        return;
      }
      const mapped: NotificationItem[] = result.data.map((n: any) => ({
        id: n.id,
        title: n.title || 'System Notification',
        message: n.message,
        ticketId: n.ticket_id || undefined,
        time: (n.timestamp || n.created_at)
          ? new Date(n.timestamp || n.created_at).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Just now',
        type: n.type || 'info',
        isRead: !!n.read,
      }));

      const countResult = await apiRequestSafe<{ count: number }>('/notifications/unread-count');
      if (cancelled) return;
      React.startTransition(() => {
        setNotifications(mapped);
        setUnreadCount(
          countResult.data && typeof countResult.data.count === 'number'
            ? countResult.data.count
            : mapped.filter((n) => !n.isRead).length
        );
      });
    };

    fetchAdminNotifications();
    const interval = setInterval(fetchAdminNotifications, 8000);
    const onTicketUpdated = () => fetchAdminNotifications();
    window.addEventListener('ticket-updated', onTicketUpdated);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('ticket-updated', onTicketUpdated);
    };
  }, []);

  const hasUnread = unreadCount > 0;

  const handleMarkAllAsRead = async () => {
    await apiRequestSafe('/notifications/read-all', { method: 'POST' });
    React.startTransition(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });
    if (onMarkAllAsRead) onMarkAllAsRead();
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      await apiRequestSafe(`/notifications/${encodeURIComponent(n.id)}/read`, { method: 'POST' });
      React.startTransition(() => {
        setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)));
        setUnreadCount((count) => Math.max(0, count - 1));
      });
    }
    setShowNotifications(false);
    if (n.ticketId) {
      navigate(`/admin/workspace/tickets/${encodeURIComponent(n.ticketId)}`);
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

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-3 shadow-2xs shrink-0">
      {/* Left: Mobile Hamburger Button */}
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
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#0284C7] text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
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
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-sky-50/50' : ''}`}
                    >
                      <p className="text-xs font-medium text-slate-800">{n.title}</p>
                      {n.message && <p className="text-[10.5px] text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>}
                      <p className="text-[10px] text-slate-500 mt-0.5">{n.time}</p>
                    </div>
                  ))
                )}
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
            <div className="w-7 h-7 rounded-full bg-[#0284C7] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {adminProfile.name.charAt(0)}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">{adminProfile.name}</div>
              <div className="text-[10.5px] font-bold text-[#0284C7] flex items-center gap-1 uppercase tracking-wider">
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
                  navigate('/login', { replace: true });
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


