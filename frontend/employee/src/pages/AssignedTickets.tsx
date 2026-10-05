import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Search, Filter, RefreshCw, Eye, Clock } from 'lucide-react';
import { EmployeeService } from '../services/employeeService';
import type { EmployeeTicket } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, type Column } from '../components/ui/Table';

export const AssignedTickets: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<EmployeeTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadTickets = () => {
    const list = EmployeeService.getAssignedTickets();
    setTickets(list);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.assignedBy && ticket.assignedBy.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const columns: Column<EmployeeTicket>[] = [
    {
      header: 'Ticket ID',
      accessorKey: 'ticketNumber',
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-[#0284C7]">{row.ticketNumber}</span>
      ),
    },
    {
      header: 'Subject',
      cell: (row) => (
        <div>
          <div className="text-xs font-semibold text-slate-800 line-clamp-1">{row.title}</div>
          <div className="text-[11px] text-slate-400 font-medium">
            {row.department} • Assigned by: {row.assignedBy || 'Team Lead'}
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
      header: 'SLA',
      cell: (row) => (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-500" />
          {row.sla || 'On Track'}
        </div>
      ),
    },
    {
      header: 'Assigned Date',
      cell: (row) => <span className="text-xs text-slate-500 font-medium">{row.assignedDate || row.createdAt}</span>,
    },
    {
      header: 'Updated Date',
      cell: (row) => <span className="text-xs text-slate-500 font-medium">{row.updatedAt}</span>,
    },
    {
      header: 'Action',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/assigned-tickets/${row.id}`)}
          className="border-slate-200 hover:border-[#0284C7] hover:bg-sky-50 text-slate-600 hover:text-[#0284C7] text-xs font-medium"
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          Work on Ticket
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Assigned Tickets</h1>
            <p className="text-xs text-slate-500 font-medium">
              Work on tickets assigned to you by the Team Lead
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
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-80">
          <Input
            placeholder="Search ticket ID, title, department..."
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
                { value: 'Pending', label: 'Pending' },
                { value: 'Resolved', label: 'Resolved' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Assigned Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <Table
          columns={columns}
          data={filteredTickets}
          keyExtractor={(r) => r.id}
          emptyMessage={
            searchTerm || statusFilter !== 'ALL'
              ? 'No assigned tickets match your search filters'
              : 'No tickets are currently assigned to you by Team Leads'
          }
        />
      </div>
    </div>
  );
};
