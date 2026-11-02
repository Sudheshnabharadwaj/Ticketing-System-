import React, { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTickets } from '../../hooks/useTickets';
import { useAuth } from '../../hooks/useAuth';
import { UserAvatar } from '../../components/common/UserAvatar';
import { TicketDetailsModal } from '../../components/tickets/TicketDetailsModal';
import { AddUserModal } from '../../components/users/AddUserModal';
import { CreateTicketModal } from '../../components/tickets/CreateTicketModal';
import { Ticket, TicketPriority, TicketStatus } from '../../types/ticket';
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
  const navigate = useNavigate();
  const { tickets, selectedTicket, setSelectedTicket, isLoading, error } = useTickets();
  const { users } = useAuth();

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dashboardFilter, setDashboardFilter] = useState<'All' | 'Unassigned' | 'In Progress' | 'SLA Risk' | 'Escalated'>('All');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Helper functions for ticket states
  // Unassigned = still active AND has no valid assigned agent. This matches the
  // Admin and Employee portals so all three agree on the same count. We rely on
  // assignedAgent (the concrete assignment) rather than the assignedToType
  // field, which is not always kept in sync when an agent is assigned.
  const isTicketUnassigned = useCallback(
    (t: Ticket) =>
      t.status !== 'Resolved' &&
      t.status !== 'Closed' &&
      (t.isUnassigned === true ||
        !t.assignedAgent ||
        t.assignedAgent.trim() === '' ||
        t.assignedAgent.toLowerCase() === 'unassigned' ||
        (t as any).assignedToType === 'unassigned'),
    [],
  );

  // Server-computed SLA status: only "At Risk" is risk; breached, resolved, and escalated are separate.
  const isTicketSLARisk = useCallback((t: Ticket) => {
    const st = (t.status || '').toLowerCase();
    if (st === 'resolved' || st === 'closed' || st === 'escalated') return false;
    return t.slaStatus === 'At Risk';
  }, []);

  // 1. Calculate Summary Card Metrics. Memoised so the counters are not
  // recomputed on every unrelated re-render of the dashboard.
  const totalTickets = tickets.length;
  const unassignedCount = useMemo(
    () => tickets.filter(isTicketUnassigned).length,
    [tickets, isTicketUnassigned],
  );
  const inProgressCount = useMemo(
    () => tickets.filter((t) => t.status === 'In Progress').length,
    [tickets],
  );
  const slaRiskCount = useMemo(
    () => tickets.filter(isTicketSLARisk).length,
    [tickets, isTicketSLARisk],
  );

  // 2. Prepare Team Members (Strictly employees, never admins or team leads)
  const employeeUsers = useMemo(() => users.filter((u) => u.role === 'employee'), [users]);
  const displayEmployees = useMemo(() => employeeUsers.slice(0, 4), [employeeUsers]);

  // Helper to count active tickets for a user. The counts are computed once
  // per ticket change instead of on every render of the dashboard.
  const employeeTicketCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const emp of displayEmployees) {
      const count = tickets.filter(
        (t) =>
          (t.employeeId === emp.id ||
            t.employee === emp.name ||
            t.assignedAgentId === emp.id ||
            t.assignedAgent === emp.name) &&
          t.status !== 'Resolved' &&
          t.status !== 'Closed'
      ).length;
      counts.set(emp.id, count);
    }
    return counts;
  }, [tickets, displayEmployees]);

  const getEmployeeActiveTicketCount = useCallback(
    (empId: string) => employeeTicketCounts.get(empId) || 0,
    [employeeTicketCounts],
  );

  // 3. Quick Filter Toolbar Pills and Filtered Recent Tickets
  const quickFilterPills: Array<'All' | 'Unassigned' | 'In Progress' | 'SLA Risk' | 'Escalated'> = [
    'All',
    'Unassigned',
    'In Progress',
    'SLA Risk',
    'Escalated'
  ];

  const quickFilterCounts = useMemo(
    () => ({
      All: tickets.length,
      Unassigned: unassignedCount,
      'In Progress': inProgressCount,
      'SLA Risk': slaRiskCount,
      Escalated: tickets.filter((t) => t.status === 'Escalated').length,
    }),
    [tickets, unassignedCount, inProgressCount, slaRiskCount],
  );

  const getQuickFilterCount = useCallback(
    (filter: 'All' | 'Unassigned' | 'In Progress' | 'SLA Risk' | 'Escalated'): number | string => {
      if (error) return '—';
      return quickFilterCounts[filter];
    },
    [error, quickFilterCounts],
  );

  const filteredRecentTickets = useMemo(
    () =>
      [...tickets]
        .filter((t) => {
          if (dashboardFilter === 'Unassigned') return isTicketUnassigned(t);
          if (dashboardFilter === 'In Progress') return t.status === 'In Progress';
          if (dashboardFilter === 'SLA Risk') return isTicketSLARisk(t);
          if (dashboardFilter === 'Escalated') return t.status === 'Escalated';
          return true;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [tickets, dashboardFilter, isTicketUnassigned, isTicketSLARisk],
  );

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

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Could not load live ticket data: {error}
        </div>
      )}

      {/* Header Banner - Matching Admin Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900 tracking-tight leading-snug">
            Team Lead Dashboard
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {isLoading ? 'Loading live ticket data…' : 'Quick overview of department tickets and team activity'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Create Ticket Button */}
          <button
            onClick={() => setIsCreateTicketModalOpen(true)}
            className="h-9 px-3.5 text-xs font-semibold text-[#0284C7] border border-[#0284C7] hover:bg-sky-50 bg-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Ticket
          </button>

          {/* Add User Button */}
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="h-9 px-3.5 text-xs font-semibold bg-[#0284C7] hover:bg-[#0369a1] text-white rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add User
          </button>
        </div>
      </div>

      {/* 1. Summary Cards - Interactive Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <button
          type="button"
          onClick={() => navigate('/teamlead/team-tickets?filter=all')}
          className="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md rounded-xl p-4 shadow-xs flex flex-col justify-between text-left transition-all duration-150 group cursor-pointer"
        >
          <div className="flex items-start justify-between w-full">
            <span className="text-[13px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
              Total Tickets
            </span>
            <div className="p-1.5 bg-blue-50 text-[#0284C7] rounded-lg border border-blue-100 group-hover:bg-blue-100/80 transition-colors">
              <TicketIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 w-full">
            <p className="text-[26px] font-bold text-slate-900 leading-tight group-hover:text-[#0284C7] transition-colors">
              {error ? '—' : totalTickets}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11.5px] text-slate-400">Department total</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0284C7] group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/teamlead/team-tickets?filter=unassigned')}
          className="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md rounded-xl p-4 shadow-xs flex flex-col justify-between text-left transition-all duration-150 group cursor-pointer"
        >
          <div className="flex items-start justify-between w-full">
            <span className="text-[13px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
              Unassigned
            </span>
            <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg border border-sky-100 group-hover:bg-sky-100/80 transition-colors">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 w-full">
            <p className="text-[26px] font-bold text-slate-900 leading-tight group-hover:text-sky-600 transition-colors">
              {error ? '—' : unassignedCount}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11.5px] text-slate-400">Pending assignment</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/teamlead/team-tickets?filter=in-progress')}
          className="bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-xl p-4 shadow-xs flex flex-col justify-between text-left transition-all duration-150 group cursor-pointer"
        >
          <div className="flex items-start justify-between w-full">
            <span className="text-[13px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
              In Progress
            </span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 group-hover:bg-indigo-100/80 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 w-full">
            <p className="text-[26px] font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
              {error ? '—' : inProgressCount}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11.5px] text-slate-400">Active queue</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/teamlead/team-tickets?filter=sla-risk')}
          className="bg-white border border-slate-200 hover:border-rose-300 hover:shadow-md rounded-xl p-4 shadow-xs flex flex-col justify-between text-left transition-all duration-150 group cursor-pointer"
        >
          <div className="flex items-start justify-between w-full">
            <span className="text-[13px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
              SLA Risk
            </span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 group-hover:bg-rose-100/80 transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 w-full">
            <p className="text-[26px] font-bold text-rose-600 leading-tight">
              {error ? '—' : slaRiskCount}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11.5px] text-slate-400">Approaching SLA</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </button>
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

        {displayEmployees.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-slate-100">
            No team members currently assigned.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {displayEmployees.map((emp, index) => {
              const ticketCount = getEmployeeActiveTicketCount(emp.id);
              const isBusy = ticketCount >= 4;
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
        )}
      </div>

      {/* 3. Recent Tickets */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              Recent Tickets
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter tickets directly or view all in department directory
            </p>
          </div>
          <Link
            to="/teamlead/team-tickets"
            className="text-xs text-[#0284C7] hover:text-[#0369a1] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* In-page Quick Filter Toolbar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
          {quickFilterPills.map((pill) => {
            const count = getQuickFilterCount(pill);
            const isActive = dashboardFilter === pill;
            return (
              <button
                key={pill}
                type="button"
                onClick={() => setDashboardFilter(pill)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0284C7] text-white shadow-2xs font-semibold'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <span>{pill}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-sky-950/30 text-white' : 'bg-white text-slate-600 border border-slate-200/70'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
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
              {filteredRecentTickets.map((t) => (
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
              {filteredRecentTickets.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                    No tickets found for filter "{dashboardFilter}"
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
