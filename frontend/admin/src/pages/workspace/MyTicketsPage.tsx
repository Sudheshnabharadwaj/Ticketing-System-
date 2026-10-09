import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Search, Filter, PlusCircle, RefreshCw, Eye } from 'lucide-react';
import { AdminApiService } from '../../services/api';
import type { Ticket } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table, type Column } from '../../components/ui/Table';

import { getCurrentSessionUser } from '../../services/unifiedAuth';

export const MyTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadTickets = async () => {
    setIsLoading(true);
    const all = await AdminApiService.getTickets('all');
    const sessionUser = getCurrentSessionUser();
    const userEmail = (sessionUser?.email || '').toLowerCase();
    const userName = (sessionUser?.name || '').toLowerCase();

    // Filter tickets requested by or assigned to current user
    const myTickets = all.filter((t) => {
      const reqEmail = (t.requesterEmail || '').toLowerCase();
      const reqName = (t.requesterName || '').toLowerCase();
      const assigned = (t.assignedTo || '').toLowerCase();
      if (userEmail && reqEmail === userEmail) return true;
      if (userName && (reqName.includes(userName) || assigned.includes(userName))) return true;
      return false;
    });
    setTickets(myTickets);
    setIsLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const columns: Column<Ticket>[] = [
    {
      header: 'Ticket ID',
      accessorKey: 'ticketNumber',
      cell: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/admin/workspace/tickets/${row.id}?from=my-tickets`)}
          className="font-mono text-xs font-bold text-[#0284C7] hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
        >
          {row.ticketNumber}
        </button>
      ),
    },
    {
      header: 'Subject',
      cell: (row) => (
        <div>
          <div className="text-xs font-semibold text-slate-800">{row.title}</div>
          <div className="text-[11px] text-slate-500 font-medium">{row.category}</div>
        </div>
      ),
    },
    {
      header: 'Priority',
      cell: (row) => {
        const variant = row.priority === 'Urgent' ? 'danger' : row.priority === 'High' ? 'warning' : 'neutral';
        return <Badge variant={variant} dot className="text-[11px] py-0.5 px-2">{row.priority}</Badge>;
      },
    },
    {
      header: 'Status',
      cell: (row) => {
        const variant = row.status === 'Escalated' ? 'danger' : row.status === 'In Progress' ? 'info' : row.status === 'Resolved' ? 'success' : 'neutral';
        return <Badge variant={variant} className="text-[11px] py-0.5 px-2">{row.status}</Badge>;
      },
    },
    {
      header: 'Department',
      cell: (row) => <span className="text-xs text-slate-700 font-medium">{row.department}</span>,
    },
    {
      header: 'Created Date',
      cell: (row) => <span className="text-xs text-slate-500 font-medium">{row.createdAt}</span>,
    },
    {
      header: 'Action',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/admin/workspace/tickets/${row.id}?from=my-tickets`)}
          className="border-slate-200 hover:border-[#0284C7] text-slate-600 hover:text-[#0284C7] text-xs font-medium cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284C7] border border-sky-100 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Tickets</h1>
            <p className="text-xs text-slate-500 font-medium">
              View and track all tickets submitted by or assigned to you (Admin)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTickets}
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/dashboard')}
            className="bg-[#0284C7] hover:bg-[#0369a1] text-white shadow-2xs font-semibold"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-80">
          <Input
            placeholder="Search ticket ID, subject or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="w-full md:w-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            Status:
          </div>
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'Open', label: 'Open' },
                { value: 'In Progress', label: 'In Progress' },
                { value: 'Escalated', label: 'Escalated' },
                { value: 'Resolved', label: 'Resolved' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <Table
          columns={columns}
          data={filteredTickets}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          emptyMessage={
            searchTerm || statusFilter !== 'ALL'
              ? 'No tickets match your search filters'
              : 'No tickets created yet. Use "Create Ticket" on the Admin Dashboard to submit a ticket.'
          }
        />
      </div>
    </div>
  );
};
