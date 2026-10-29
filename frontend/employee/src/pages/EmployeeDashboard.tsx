import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Table, type Column } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import {
  Ticket as TicketIcon,
  PlusCircle,
  Clock,
  UserCheck,
  Hourglass,
  CheckCircle2,
  AlertCircle,
  Eye
} from 'lucide-react';
import { EmployeeService } from '../services/employeeService';
import type { EmployeeTicket } from '../types';

export const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(() => EmployeeService.getTickets().length === 0);
  const [recentTickets, setRecentTickets] = useState<EmployeeTicket[]>(() => EmployeeService.getEmployeeTickets().slice(0, 5));
  const [stats, setStats] = useState(() => EmployeeService.getSummaryStats());

  useEffect(() => {
    let cancelled = false;
    const loadDashboardData = async (force = false) => {
      try {
        if (EmployeeService.getTickets().length === 0) {
          setLoading(true);
        }
        await EmployeeService.fetchTickets(force);
        if (cancelled) return;
        const employeeTickets = EmployeeService.getEmployeeTickets();
        const summary = EmployeeService.getSummaryStats();
        if (cancelled) return;
        setRecentTickets(employeeTickets.slice(0, 5));
        setStats(summary);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboardData(false);
    const onTicketUpdated = () => loadDashboardData(false);
    window.addEventListener('ticket-updated', onTicketUpdated);
    window.addEventListener('storage', onTicketUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('ticket-updated', onTicketUpdated);
      window.removeEventListener('storage', onTicketUpdated);
    };
  }, []);

  const recentColumns: Column<EmployeeTicket>[] = [
    {
      header: 'Ticket ID',
      accessorKey: 'ticketNumber',
      cell: (row) => {
        const targetPath = row.assignedBy ? `/assigned-tickets/${row.id}` : `/tickets/${row.id}`;
        return (
          <button
            onClick={() => navigate(`${targetPath}?mode=view`)}
            className="font-mono text-[#0284C7] font-bold text-xs hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
            title="View Ticket"
          >
            {row.ticketNumber}
          </button>
        );
      },
    },
    {
      header: 'Subject',
      cell: (row) => (
        <div>
          <div className="font-semibold text-slate-900 text-xs">{row.title}</div>
          <div className="text-[11px] text-slate-500">
            {row.assignedBy ? (
              <span className="text-slate-600 font-medium">Assigned by {row.assignedBy}</span>
            ) : (
              <span>Category: {row.category}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Priority',
      cell: (row) => <Badge priority={row.priority} />,
    },
    {
      header: 'Status',
      cell: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Created Date',
      cell: (row) => <span className="text-[11.5px] text-slate-500">{row.createdAt}</span>,
    },
    {
      header: 'Updated Date',
      cell: (row) => <span className="text-[11.5px] text-slate-500">{row.updatedAt}</span>,
    },
    {
      header: 'Action',
      cell: (row) => {
        const targetPath = row.assignedBy ? `/assigned-tickets/${row.id}` : `/tickets/${row.id}`;
        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${targetPath}?mode=view`)}
              icon={<Eye className="w-3.5 h-3.5" />}
              title="View"
              className="text-xs"
            >
              View
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white px-6 py-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
            Employee Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your submitted tickets and work on support requests assigned by Team Leads.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/knowledge-base')}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
          >
            Search Knowledge Base
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/create-ticket')}
            icon={<PlusCircle className="w-4 h-4" />}
            className="font-semibold shadow-sm bg-[#0284C7] hover:bg-[#0369a1] text-white"
          >
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* My Tickets */}
        <div
          onClick={() => navigate('/tickets?scope=my')}
          className="bg-white border border-slate-200 hover:border-[#0284C7] rounded-xl p-3.5 shadow-2xs hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-600">My Tickets</span>
            <div className="p-1 bg-sky-50 text-[#0284C7] rounded border border-sky-200">
              <TicketIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 leading-none">
              {stats.myTicketsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Created by me</p>
          </div>
        </div>

        {/* Assigned Tickets */}
        <div
          onClick={() => navigate('/assigned-tickets')}
          className="bg-white border border-slate-200 hover:border-[#0284C7] rounded-xl p-3.5 shadow-2xs hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-600">Assigned Tickets</span>
            <div className="p-1 bg-sky-50 text-[#0284C7] rounded border border-sky-200">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 leading-none">
              {stats.assignedTicketsCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Assigned to me</p>
          </div>
        </div>

        {/* Open */}
        <div
          onClick={() => navigate('/tickets?status=Open')}
          className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-3.5 shadow-2xs hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-600 group-hover:text-blue-700 transition-colors">Open</span>
            <div className="p-1 bg-blue-50 text-blue-600 rounded border border-blue-200">
              <Hourglass className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-700 leading-none">{stats.open}</div>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting pickup</p>
          </div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => navigate('/tickets?status=In Progress')}
          className="bg-white border border-slate-200 hover:border-[#0284C7] rounded-xl p-3.5 shadow-2xs hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-600 group-hover:text-[#0284C7] transition-colors">In Progress</span>
            <div className="p-1 bg-sky-50 text-[#0284C7] rounded border border-sky-200">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0284C7] leading-none">{stats.inProgress}</div>
            <p className="text-[11px] text-slate-500 mt-1">Currently working</p>
          </div>
        </div>

        {/* Pending */}
        <div
          onClick={() => navigate('/tickets?status=Pending')}
          className="bg-white border border-slate-200 hover:border-amber-400 rounded-xl p-3.5 shadow-2xs hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-600 group-hover:text-amber-700 transition-colors">Pending</span>
            <div className="p-1 bg-amber-50 text-amber-600 rounded border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 leading-none">{stats.pending}</div>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting response</p>
          </div>
        </div>

        {/* Resolved */}
        <div
          onClick={() => navigate('/tickets?status=Resolved')}
          className="bg-white border border-slate-200 hover:border-emerald-400 rounded-xl p-3.5 shadow-2xs hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-600 group-hover:text-emerald-700 transition-colors">Resolved</span>
            <div className="p-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600 leading-none">{stats.resolved}</div>
            <p className="text-[11px] text-slate-500 mt-1">Completed tickets</p>
          </div>
        </div>
      </div>

      {/* Recent Tickets Table Section */}
      <Card
        headerClassName="px-5 py-3.5 bg-slate-50/50 border-b border-slate-200"
        bodyClassName="p-0"
        title={
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0284C7]" />
            <span className="text-base font-semibold text-slate-900">Recent Tickets</span>
            <Badge variant="neutral" className="text-[11px] py-0.5 px-2">
              {recentTickets.length} recent
            </Badge>
          </div>
        }
      >
        <Table
          columns={recentColumns}
          data={recentTickets}
          keyExtractor={(row) => row.id}
          compact
        />
      </Card>
    </div>
  );
};
