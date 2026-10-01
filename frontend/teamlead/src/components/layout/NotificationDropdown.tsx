import React, { useState } from 'react';
import { Bell, Check, CheckCheck, Ticket, AlertTriangle, AlertCircle } from 'lucide-react';
import { useTickets } from '../../hooks/useTickets';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, markNotificationRead, markAllNotificationsRead } = useTickets();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Check className="w-4 h-4 text-emerald-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Ticket className="w-4 h-4 text-sky-600" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-sky-100 text-sky-700 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="text-xs font-medium text-sky-600 hover:text-sky-800 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No notifications available.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationRead(notif.id)}
                    className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                      !notif.read ? 'bg-sky-50/40' : ''
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs shrink-0 mt-0.5">
                      {renderIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                          {notif.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{notif.message}</p>
                    </div>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0 mt-2" />
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-2 bg-slate-50 border-t border-slate-200 text-center">
              <span className="text-[11px] font-medium text-slate-500">
                ApexITSM Real-Time Alert Stream
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
