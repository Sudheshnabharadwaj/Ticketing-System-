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
  const [allTickets, setAllTickets] = useState<EmployeeTicket[]>(() => {
    const my = EmployeeService.getEmployeeTickets();
    const asg = EmployeeService.getAssignedTickets();
    const map = new Map<string, EmployeeTicket>();
    [...my, ...asg].forEach(t => map.set(t.id, t));
    return Array.from(map.values());
  });
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [stats, setStats] = useState(() => EmployeeService.getSummaryStats());

  const loadDashboardData = async () => {
    try {
      await EmployeeService.fetchProfile();
      await EmployeeService.fetchTickets();
      const myTickets = EmployeeService.getEmployeeTickets();
      const assignedTickets = EmployeeService.getAssignedTickets();
      const combinedMap = new Map<string, EmployeeTicket>();
      [...myTickets, ...assignedTickets].forEach(t => combinedMap.set(t.id, t));
      const combined = Array.from(combinedMap.values());
      setAllTickets(combined);
      const summary = EmployeeService.getSummaryStats();
      setStats(summary);
    } catch (e) {
      console.error('Error loading employee dashboard data:', e);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const filteredTickets = React.useMemo(() => {
    if (!activeFilter) return allTickets.slice(0, 10);
    return allTickets.filter(
      (t) => (t.status || '').trim().toLowerCase() === activeFilter.trim().toLowerCase()
    );
  }, [allTickets, activeFilter]);

  const recentColumns: Column<EmployeeTicket>[] = [
    {
      header: 'Ticket ID',
      accessorKey: 'ticketNumber',
      cell: (row) => (
        <button
          onClick={() => navigate(row.assignedBy ? `/assigned-tickets/${row.id}` : `/tickets/${row.id}`)}
          className="font-mono text-[#0284C7] font-bold text-xs hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
        >
          {row.ticketNumber}
        </button>
      ),
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
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(row.assignedBy ? `/assigned-tickets/${row.id}` : `/tickets/${row.id}`)}
          icon={<Eye className="w-3.5 h-3.5" />}
        >
          View
        </Button>
      ),
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
          onClick={() => navigate('/tickets')}
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
          onClick={() => setActiveFilter(activeFilter === 'Open' ? null : 'Open')}
          className={`bg-white border rounded-xl p-3.5 shadow-2xs flex flex-col justify-between cursor-pointer transition-all hover:shadow-xs ${
            activeFilter === 'Open'
              ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/20'
              : 'border-slate-200 hover:border-blue-400'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-600">Open</span>
            <div className="p-1 bg-blue-50 text-blue-600 rounded border border-blue-200">
              <Hourglass className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-700 leading-none">{stats.open}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {activeFilter === 'Open' ? 'Active filter (click to reset)' : 'Awaiting pickup'}
            </p>
          </div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'In Progress' ? null : 'In Progress')}
          className={`bg-white border rounded-xl p-3.5 shadow-2xs flex flex-col justify-between cursor-pointer transition-all hover:shadow-xs ${
            activeFilter === 'In Progress'
              ? 'border-[#0284C7] ring-2 ring-[#0284C7]/30 bg-sky-50/20'
              : 'border-slate-200 hover:border-[#0284C7]'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-600">In Progress</span>
            <div className="p-1 bg-sky-50 text-[#0284C7] rounded border border-sky-200">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0284C7] leading-none">{stats.inProgress}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {activeFilter === 'In Progress' ? 'Active filter (click to reset)' : 'Currently working'}
            </p>
          </div>
        </div>

        {/* Pending */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'Pending' ? null : 'Pending')}
          className={`bg-white border rounded-xl p-3.5 shadow-2xs flex flex-col justify-between cursor-pointer transition-all hover:shadow-xs ${
            activeFilter === 'Pending'
              ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-50/20'
              : 'border-slate-200 hover:border-amber-400'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-600">Pending</span>
            <div className="p-1 bg-amber-50 text-amber-600 rounded border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 leading-none">{stats.pending}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {activeFilter === 'Pending' ? 'Active filter (click to reset)' : 'Awaiting response'}
            </p>
          </div>
        </div>

        {/* Resolved */}
        <div
          onClick={() => setActiveFilter(activeFilter === 'Resolved' ? null : 'Resolved')}
          className={`bg-white border rounded-xl p-3.5 shadow-2xs flex flex-col justify-between cursor-pointer transition-all hover:shadow-xs ${
            activeFilter === 'Resolved'
              ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/20'
              : 'border-slate-200 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-600">Resolved</span>
            <div className="p-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600 leading-none">{stats.resolved}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {activeFilter === 'Resolved' ? 'Active filter (click to reset)' : 'Completed tickets'}
            </p>
          </div>
        </div>
      </div>

      {/* Tickets Table Section */}
      <Card
        headerClassName="px-5 py-3.5 bg-slate-50/50 border-b border-slate-200"
        bodyClassName="p-0"
        title={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0284C7]" />
              <span className="text-base font-semibold text-slate-900">
                {activeFilter ? `${activeFilter} Tickets` : 'Recent Tickets'}
              </span>
              <Badge variant="neutral" className="text-[11px] py-0.5 px-2">
                {filteredTickets.length} {activeFilter ? 'filtered' : 'recent'}
              </Badge>
            </div>
            {activeFilter && (
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className="text-xs font-semibold text-[#0284C7] hover:underline cursor-pointer bg-transparent border-0"
              >
                Show All Tickets
              </button>
            )}
          </div>
        }
      >
        <Table
          columns={recentColumns}
          data={filteredTickets}
          keyExtractor={(row) => row.id}
          compact
        />
      </Card>
    </div>
  );
};
