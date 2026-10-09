import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Clock,
  Ticket,
  UserCheck,
  AlertTriangle,
  MessageSquare,
  CheckCircle2
} from 'lucide-react';
import { EmployeeService } from '../services/employeeService';
import type { EmployeeNotificationItem } from '../types';
import { Button } from '../components/ui/Button';

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<EmployeeNotificationItem[]>([]);

  const loadNotifs = async () => {
    const list = await EmployeeService.fetchNotifications();
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const handleMarkAllRead = () => {
    const updated = EmployeeService.markNotificationsAsRead();
    setNotifications(updated);
  };

  const getCategoryIcon = (category: EmployeeNotificationItem['category']) => {
    switch (category) {
      case 'New ticket assigned':
        return <UserCheck className="w-4 h-4 text-amber-600" />;
      case 'Ticket status changed':
        return <Ticket className="w-4 h-4 text-[#0284C7]" />;
      case 'New comment':
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      case 'SLA notification':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'Ticket resolved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const getCategoryBadgeClass = (category: EmployeeNotificationItem['category']) => {
    switch (category) {
      case 'New ticket assigned':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Ticket status changed':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'New comment':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SLA notification':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Ticket resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284C7] border border-sky-100 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0284C7] text-white">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Important alerts regarding assigned tickets, SLA status, and updates
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
          >
            <CheckCheck className="w-4 h-4 mr-1.5 text-[#0284C7]" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No notifications</p>
            <p className="text-xs text-slate-400 mt-0.5">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/assigned-tickets/${item.ticketId}`)}
              className={`p-5 transition-colors cursor-pointer hover:bg-slate-50 flex items-start justify-between gap-4 ${
                !item.isRead ? 'bg-sky-50/30' : ''
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0 mt-0.5">
                  {getCategoryIcon(item.category)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(
                        item.category
                      )}`}
                    >
                      {item.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {item.time}
                    </span>
                    <span>•</span>
                    <span>{item.date}</span>
                    <span>•</span>
                    <span className="font-mono text-[#0284C7] font-bold">{item.ticketNumber}</span>
                  </div>
                </div>
              </div>

              {!item.isRead && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#0284C7] shrink-0 mt-2" title="Unread" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
