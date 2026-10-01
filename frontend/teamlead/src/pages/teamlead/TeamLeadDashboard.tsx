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
  CheckCircle2
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
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 rounded">
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
          <span className="px-2 py-0.5 text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200 rounded-full inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Open
          </span>
        );
      case 'In Progress':
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            In Progress
          </span>
        );
      case 'Pending':
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Pending
          </span>
        );
      case 'Escalated':
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-full inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Escalated
          </span>
        );
      case 'Resolved':
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Resolved
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 rounded-full inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Closed
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-full min-w-0 pb-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full max-w-full">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
            Team Lead Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Quick overview of tickets and team activity
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Create Ticket Button (Blue outline) */}
          <button
            onClick={() => setIsCreateTicketModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-sky-600 border border-sky-600 hover:bg-sky-50 bg-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            + Create Ticket
          </button>

          {/* Add User Button (Blue background, White text) */}
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Add User
          </button>
        </div>
      </div>

      {/* 1. Summary Cards (4 Cards in one row on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500 mb-1">Total Tickets</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{totalTickets}</p>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500 mb-1">Unassigned</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{unassignedCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500 mb-1">In Progress</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900">{inProgressCount}</p>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <p className="text-xs font-medium text-slate-500 mb-1">SLA Risk</p>
          <p className="text-lg sm:text-xl font-bold text-rose-600">{slaRiskCount}</p>
        </div>
      </div>

      {/* 2. Team Members */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight">
            TEAM MEMBERS
          </h2>
          <Link
            to="/teamlead/employees"
            className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1 hover:underline cursor-pointer"
          >
            View All <ArrowRight className="w-3 h-3" />
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
                className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/80 flex items-start space-x-3"
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
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight">
            TICKETS NEEDING ATTENTION
          </h2>
          <Link
            to="/teamlead/team-tickets"
            className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1 hover:underline cursor-pointer"
          >
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto w-full max-w-full min-w-0">
          <table className="w-full text-left border-collapse table-fixed max-w-full min-w-0">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-3 w-[12%]">Ticket ID</th>
                <th className="py-2 px-3 w-[42%]">Subject</th>
                <th className="py-2 px-3 w-[14%]">Priority</th>
                <th className="py-2 px-3 w-[18%]">Status</th>
                <th className="py-2 px-3 w-[14%] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {ticketsNeedingAttention.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2 px-3 font-mono font-semibold text-sky-600 text-xs truncate min-w-0">{t.id}</td>
                  <td className="py-2 px-3 font-medium text-slate-900 truncate min-w-0 whitespace-nowrap" title={t.subject}>
                    {t.subject}
                  </td>
                  <td className="py-2 px-3 min-w-0 whitespace-nowrap">{renderPriorityBadge(t.priority)}</td>
                  <td className="py-2 px-3 min-w-0 whitespace-nowrap">{renderStatusBadge(t.status)}</td>
                  <td className="py-2 px-3 text-right min-w-0 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedTicket(t)}
                      className="px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer whitespace-nowrap"
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
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight">
            RECENT TICKETS
          </h2>
          <Link
            to="/teamlead/team-tickets"
            className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1 hover:underline cursor-pointer"
          >
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto w-full max-w-full min-w-0">
          <table className="w-full text-left border-collapse table-fixed max-w-full min-w-0">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-3 w-[12%]">Ticket ID</th>
                <th className="py-2 px-3 w-[42%]">Subject</th>
                <th className="py-2 px-3 w-[14%]">Priority</th>
                <th className="py-2 px-3 w-[18%]">Status</th>
                <th className="py-2 px-3 w-[14%] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {recentTickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2 px-3 font-mono font-semibold text-sky-600 text-xs truncate min-w-0">{t.id}</td>
                  <td className="py-2 px-3 font-medium text-slate-900 truncate min-w-0 whitespace-nowrap" title={t.subject}>
                    {t.subject}
                  </td>
                  <td className="py-2 px-3 min-w-0 whitespace-nowrap">{renderPriorityBadge(t.priority)}</td>
                  <td className="py-2 px-3 min-w-0 whitespace-nowrap">{renderStatusBadge(t.status)}</td>
                  <td className="py-2 px-3 text-right min-w-0 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedTicket(t)}
                      className="px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer whitespace-nowrap"
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

