import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTickets } from '../../hooks/useTickets';
import { useAuth } from '../../hooks/useAuth';
import { UserAvatar } from '../../components/common/UserAvatar';
import { TicketDetailsModal } from '../../components/tickets/TicketDetailsModal';
import { AddUserModal } from '../../components/users/AddUserModal';
import { CreateTicketModal } from '../../components/tickets/CreateTicketModal';
import { TicketPriority, TicketStatus } from '../../types/ticket';
import {
  Plus,
  UserPlus,
  ArrowRight,
  CheckCircle2,
  Ticket as TicketIcon,
  Inbox,
  Clock,
  AlertTriangle
} from 'lucide-react';

export const TeamLeadDashboard: React.FC = () => {
  const { tickets, selectedTicket, setSelectedTicket } = useTickets();
  const { users } = useAuth();

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Calculate Summary Card Metrics
  const totalTickets = tickets.length;
  const unassignedCount = tickets.filter(
    (t) =>
      !t.assignedAgent ||
      t.assignedAgent === 'Unassigned' ||
      t.assignedToType === 'unassigned'
  ).length;
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;
  const slaRiskCount = tickets.filter(
    (t) => t.slaStatus === 'At Risk' || t.slaStatus === 'Breached'
  ).length;

  // 2. Prepare Team Members (Max 4 active employees)
  const employeeUsers = users.filter((u) => u.role === 'employee');
  const displayEmployees = (employeeUsers.length > 0 ? employeeUsers : users).slice(0, 4);

  // Helper to count active tickets for a user
  const getEmployeeActiveTicketCount = (empId: string, empName: string) => {
    return tickets.filter(
      (t) =>
        (t.employeeId === empId ||
          t.employee === empName ||
          t.assignedAgentId === empId ||
          t.assignedAgent === empName) &&
        t.status !== 'Resolved' &&
        t.status !== 'Closed'
    ).length;
  };

  // 3. Tickets Needing Attention (Critical, High priority, SLA risk, Escalated, Pending)
  const ticketsNeedingAttention = tickets
    .filter(
      (t) =>
        t.priority === 'Critical' ||
        t.priority === 'High' ||
        t.status === 'Escalated' ||
        t.slaStatus === 'At Risk' ||
        t.slaStatus === 'Breached' ||
        t.status === 'Pending'
    )
    .slice(0, 5);

  // 4. Recent Tickets (Latest 5 tickets)
  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Priority Badge Renderer
  const renderPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'Critical':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded">
            Critical
          </span>
        );
      case 'High':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded">
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 rounded">
            Medium
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded">
            Low
          </span>
        );
    }
  };

  // Status Badge Renderer
  const renderStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'Open':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 rounded">
            Open
          </span>
        );
      case 'In Progress':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
            In Progress
          </span>
        );
      case 'Pending':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded">
            Pending
          </span>
        );
      case 'Resolved':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
            Resolved
          </span>
        );
      case 'Escalated':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded">
            Escalated
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded">
            Closed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 pb-6 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Header Banner - Matching Admin Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900 tracking-tight leading-snug">
            Team Lead Dashboard
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Quick overview of department tickets and team activity
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Create Ticket Button */}
          <button
            onClick={() => setIsCreateTicketModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#0284C7] border border-[#0284C7] hover:bg-sky-50 bg-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            + Create Ticket
          </button>

          {/* Add User Button */}
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-[#0284C7] hover:bg-[#0369a1] text-white rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Add User
          </button>
        </div>
      </div>

      {/* 1. Summary Cards - Matching Admin Dashboard 4-card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-medium text-slate-500">Total Tickets</span>
            <div className="p-1.5 bg-blue-50 text-[#0284C7] rounded-lg border border-blue-100">
              <TicketIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-[26px] font-bold text-slate-900 leading-tight">{totalTickets}</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">Department total</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-medium text-slate-500">Unassigned</span>
            <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg border border-sky-100">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-[26px] font-bold text-slate-900 leading-tight">{unassignedCount}</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">Pending assignment</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-medium text-slate-500">In Progress</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-[26px] font-bold text-slate-900 leading-tight">{inProgressCount}</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">Active queue</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-medium text-slate-500">SLA Risk</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-[26px] font-bold text-rose-600 leading-tight">{slaRiskCount}</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">Approaching SLA</p>
          </div>
        </div>
      </div>

      {/* 2. Team Members */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
            Team Members
          </h2>
          <Link
            to="/teamlead/employees"
            className="text-xs text-[#0284C7] hover:text-[#0369a1] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {displayEmployees.map((emp, index) => {
            const ticketCount = getEmployeeActiveTicketCount(emp.id, emp.name);
            const isBusy = index === 2 || ticketCount >= 4;
            const firstName = emp.name.split(' ')[0];

            return (
              <div
                key={emp.id}
                className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 flex items-start space-x-3"
              >
                <UserAvatar
                  name={emp.name}
                  avatar={emp.avatar}
                  size="lg"
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate" title={emp.name}>
                    {firstName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{ticketCount} Tickets</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isBusy ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                    <span className="text-xs text-slate-600 font-medium">
                      {isBusy ? 'Busy' : 'Available'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Tickets Needing Attention */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
            Tickets Needing Attention
          </h2>
          <Link
            to="/teamlead/team-tickets"
            className="text-xs text-[#0284C7] hover:text-[#0369a1] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto w-full max-w-full min-w-0">
          <table className="w-full min-w-[650px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-28 whitespace-nowrap">Ticket ID</th>
                <th className="py-2.5 px-3 min-w-[200px]">Subject</th>
                <th className="py-2.5 px-3 w-28 whitespace-nowrap">Priority</th>
                <th className="py-2.5 px-3 w-28 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 w-20 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {ticketsNeedingAttention.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-semibold text-[#0284C7] text-xs whitespace-nowrap">{t.id}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 truncate" title={t.subject}>
                    {t.subject}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{renderPriorityBadge(t.priority)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{renderStatusBadge(t.status)}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedTicket(t)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#0284C7] hover:text-[#0369a1] hover:bg-sky-50 rounded transition-colors cursor-pointer whitespace-nowrap"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {ticketsNeedingAttention.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-xs text-slate-400">
                    No urgent tickets needing attention
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Recent Tickets */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
            Recent Tickets
          </h2>
          <Link
            to="/teamlead/team-tickets"
            className="text-xs text-[#0284C7] hover:text-[#0369a1] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto w-full max-w-full min-w-0">
          <table className="w-full min-w-[650px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-28 whitespace-nowrap">Ticket ID</th>
                <th className="py-2.5 px-3 min-w-[200px]">Subject</th>
                <th className="py-2.5 px-3 w-28 whitespace-nowrap">Priority</th>
                <th className="py-2.5 px-3 w-28 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 w-20 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {recentTickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-semibold text-[#0284C7] text-xs whitespace-nowrap">{t.id}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 truncate" title={t.subject}>
                    {t.subject}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{renderPriorityBadge(t.priority)}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">{renderStatusBadge(t.status)}</td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedTicket(t)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#0284C7] hover:text-[#0369a1] hover:bg-sky-50 rounded transition-colors cursor-pointer whitespace-nowrap"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {recentTickets.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-xs text-slate-400">
                    No recent tickets available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {selectedTicket && (
        <TicketDetailsModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={showToast}
      />

      <CreateTicketModal
        isOpen={isCreateTicketModalOpen}
        onClose={() => setIsCreateTicketModalOpen(false)}
        onSuccess={showToast}
      />
    </div>
  );
};
