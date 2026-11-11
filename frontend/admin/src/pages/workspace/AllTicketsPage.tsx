import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Table, type Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { Ticket } from '../../types';
import { AdminApiService } from '../../services/api';
import { Search, RefreshCw, Eye, CheckCircle } from 'lucide-react';

export const AllTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [tickets, setTickets] = useState<Ticket[]>(() => AdminApiService.getCachedTickets() || []);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>(() => AdminApiService.getCachedTickets() || []);
  const [isLoading, setIsLoading] = useState(() => !AdminApiService.getCachedTickets() || AdminApiService.getCachedTickets()!.length === 0);
  const [search, setSearch] = useState(urlSearch);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchTickets = async (force = false) => {
    if (!AdminApiService.getCachedTickets() || AdminApiService.getCachedTickets()!.length === 0) {
      setIsLoading(true);
    }
    const data = await AdminApiService.getTickets('all', force);
    setTickets(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTickets(false);
    const handleTicketUpdated = () => {
      fetchTickets(false);
    };
    window.addEventListener('ticket-updated', handleTicketUpdated);
    window.addEventListener('storage', handleTicketUpdated);
    return () => {
      window.removeEventListener('ticket-updated', handleTicketUpdated);
      window.removeEventListener('storage', handleTicketUpdated);
    };
  }, []);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    const nextParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      nextParams.set('search', val);
    } else {
      nextParams.delete('search');
    }
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    let result = tickets;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        t =>
          String(t.ticketNumber || '').toLowerCase().includes(q) ||
          String(t.id || '').toLowerCase().includes(q) ||
          String(t.title || '').toLowerCase().includes(q) ||
          String(t.description || '').toLowerCase().includes(q) ||
          String(t.requesterName || '').toLowerCase().includes(q) ||
          String(t.category || '').toLowerCase().includes(q) ||
          String(t.department || '').toLowerCase().includes(q) ||
          String(t.assignedTo || '').toLowerCase().includes(q) ||
          String(t.priority || '').toLowerCase().includes(q) ||
          String(t.status || '').toLowerCase().includes(q)
      );
    }

    if (departmentFilter !== 'all') {
      const targetDept = departmentFilter.toLowerCase();
      const standardDepts = new Set(['it support', 'it', 'hr', 'finance', 'operations', 'sales', 'marketing', 'legal', 'facilities', 'general administration']);
      if (targetDept === 'other') {
        result = result.filter(t => {
          if (!t.department) return false;
          const deptStr = String(t.department).toLowerCase().trim();
          if (deptStr === 'other') return true;
          const parts = deptStr.split(/[,/&]+/).map(p => p.trim());
          return !parts.some(p => standardDepts.has(p));
        });
      } else {
        result = result.filter(t => {
          if (!t.department) return false;
          const deptStr = String(t.department).toLowerCase();
          const parts = deptStr.split(/[,/&]+/).map(p => p.trim());
          return parts.some(p => p.includes(targetDept) || targetDept.includes(p)) || deptStr.includes(targetDept);
        });
      }
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'unassigned') {
        result = result.filter(
          t => !t.assignedTo || t.assignedTo.trim() === '' || t.assignedTo.toLowerCase() === 'unassigned'
        );
      } else {
        result = result.filter(t => t.status.toLowerCase() === statusFilter.toLowerCase());
      }
    }

    if (priorityFilter !== 'all') {
      result = result.filter(t => t.priority.toLowerCase() === priorityFilter.toLowerCase());
    }

    setFilteredTickets(result);
  }, [search, departmentFilter, statusFilter, priorityFilter, tickets]);

  const columns: Column<Ticket>[] = [
    {
      header: 'Ticket ID',
      accessorKey: 'ticketNumber',
      cell: (row) => (
        <button
          onClick={() => navigate(`/admin/workspace/tickets/${row.id}?from=all-tickets`)}
          className="font-mono text-[#2563EB] font-semibold text-[12.5px] hover:underline text-left cursor-pointer"
          title="View Ticket"
        >
          {row.ticketNumber}
        </button>
      )
    },
    {
      header: 'Subject',
      cell: (row) => (
        <div>
          <div className="font-medium text-slate-900 text-[12.5px]">{row.title}</div>
          <div className="text-[11px] text-slate-500">{row.category}</div>
        </div>
      )
    },
    {
      header: 'Department',
      cell: (row) => (
        <span className="text-[11.5px] font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
          {row.department}
        </span>
      )
    },
    {
      header: 'Priority',
      cell: (row) => {
        const variant = row.priority === 'Critical' ? 'danger' : row.priority === 'High' ? 'warning' : 'neutral';
        return <Badge variant={variant} dot className="text-[11px] py-0.5 px-2">{row.priority}</Badge>;
      }
    },
    {
      header: 'Status',
      cell: (row) => {
        const variant = row.status === 'Escalated' ? 'danger' : row.status === 'In Progress' ? 'info' : row.status === 'Resolved' ? 'success' : 'neutral';
        return <Badge variant={variant} className="text-[11px] py-0.5 px-2">{row.status}</Badge>;
      }
    },
    {
      header: 'Assigned Team',
      cell: (row) => (
        <div>
          <div className="text-slate-800 font-medium text-[12.5px]">{row.assignedTo || 'Unassigned'}</div>
          <div className="text-[11px] text-slate-500">{row.requesterName}</div>
        </div>
      )
    },
    {
      header: 'Updated Time',
      cell: (row) => <span className="text-[11.5px] text-slate-500">{row.createdAt}</span>
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => navigate(`/admin/workspace/tickets/${row.id}?from=all-tickets`)}
            title="View Ticket"
            className="text-xs"
          >
            View
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary" className="text-[12px] py-0.5 px-2.5">Workspace</Badge>
            <span className="text-[13px] text-slate-500">Department-wise Directory</span>
          </div>
          <h1 className="text-[26px] font-bold text-slate-900 tracking-tight mt-1 mb-0">All Tickets Directory</h1>
          <p className="text-[13px] text-slate-500 mt-1">Master table of all employee support tickets with department filtering.</p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={() => fetchTickets(true)}
          className="text-[13px]"
        >
          Refresh
        </Button>
      </div>

      <Card>
        {/* Filter Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <Input
              placeholder="Search by ID, title, or requester..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
          <div>
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Departments' },
                { value: 'IT Support', label: 'IT Support' },
                { value: 'HR', label: 'HR' },
                { value: 'Finance', label: 'Finance' },
                { value: 'Operations', label: 'Operations' },
                { value: 'Sales', label: 'Sales' },
                { value: 'Marketing', label: 'Marketing' },
                { value: 'Legal', label: 'Legal' },
                { value: 'Facilities', label: 'Facilities' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'unassigned', label: 'Unassigned' },
                { value: 'open', label: 'Open' },
                { value: 'in progress', label: 'In Progress' },
                { value: 'escalated', label: 'Escalated' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
          </div>
          <div>
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Priorities' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredTickets}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage={search.trim() ? `No tickets found matching "${search}"` : 'No tickets found'}
        />
      </Card>
    </div>
  );
};
