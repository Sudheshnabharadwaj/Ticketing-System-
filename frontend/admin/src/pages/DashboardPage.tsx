import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, type Column } from '../components/ui/Table';
import type { Ticket, DashboardStats } from '../types';
import { AdminApiService } from '../services/api';
import { AttachmentFilePicker, type AttachedFile } from '../components/ui/AttachmentFilePicker';
import { TeamLeadEmployeeSelector } from '../components/ui/TeamLeadEmployeeSelector';
import { OrganizationService, type TeamLeadItem, type EmployeeItem } from '../services/organizationService';
import {
  Ticket as TicketIcon,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Hourglass,
  PlusCircle,
  Check,
  CheckCircle,
  AlertCircle,
  X,
  Inbox,
  Eye,
} from 'lucide-react';

const DEFAULT_DEPARTMENT_OPTIONS = [
  'IT Support',
  'Finance',
  'HR',
  'Facilities',
  'General Administration',
  'Other',
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(DEFAULT_DEPARTMENT_OPTIONS);
  const [stats, setStats] = useState<DashboardStats | null>(() => AdminApiService.getCachedStats());
  const [tickets, setTickets] = useState<Ticket[]>(() => AdminApiService.getCachedTickets() || []);
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(() => !AdminApiService.getCachedStats() && (!AdminApiService.getCachedTickets() || AdminApiService.getCachedTickets()!.length === 0));
  const [loadError, setLoadError] = useState(false);

  // Modal State for Admin Create Ticket
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Hardware');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(['IT Support']);
  const [customDepartment, setCustomDepartment] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newDescription, setNewDescription] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [selectedTeamLeadIds, setSelectedTeamLeadIds] = useState<string[]>([]);
  const [selectedTeamLeadObjs, setSelectedTeamLeadObjs] = useState<TeamLeadItem[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedEmployeeObjs, setSelectedEmployeeObjs] = useState<EmployeeItem[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<{ message: string; emailMessage?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDepartment = (deptName: string) => {
    let next: string[];
    if (selectedDepartments.includes(deptName)) {
      if (selectedDepartments.length === 1) return;
      next = selectedDepartments.filter((d) => d !== deptName);
    } else {
      next = [...selectedDepartments, deptName];
    }
    setSelectedDepartments(next);
    setSelectedTeamLeadIds([]);
    setSelectedTeamLeadObjs([]);
    setSelectedEmployeeIds([]);
    setSelectedEmployeeObjs([]);
  };

  const isOtherDeptSelected = selectedDepartments.includes('Other');

  // Compute active department list and routing leads
  const activeDepartments = selectedDepartments.map((dept) =>
    dept === 'Other' ? (customDepartment.trim() || 'Other Department') : dept
  );

  const loadData = async (force = false) => {
    if (!stats && tickets.length === 0) {
      setIsLoading(true);
    }
    setLoadError(false);
    const [statsData, ticketsData] = await Promise.all([
      AdminApiService.getDashboardStats(force),
      AdminApiService.getTickets('all', force),
    ]);
    setStats(statsData);
    setTickets(ticketsData);
    setLoadError(statsData === null && ticketsData.length === 0);
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    const run = async (force = false) => {
      if (!AdminApiService.getCachedStats() && (!AdminApiService.getCachedTickets() || AdminApiService.getCachedTickets()!.length === 0)) {
        setIsLoading(true);
      }
      setLoadError(false);
      try {
        const [statsData, ticketsData] = await Promise.all([
          AdminApiService.getDashboardStats(force),
          AdminApiService.getTickets('all', force),
        ]);
        if (cancelled) return;
        setStats(statsData);
        setTickets(ticketsData);
        setLoadError(statsData === null && ticketsData.length === 0);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void run(false);
    OrganizationService.syncFromDatabase().then(() => {
      const depts = OrganizationService.getDepartments();
      if (depts && depts.length > 0) {
        const names = depts.map((d) => d.name);
        if (!names.includes('Other')) names.push('Other');
        setDepartmentOptions(names);
      }
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'ticket_refresh_event' || e.key === 'itsm_tickets_version') {
        AdminApiService.invalidateCache();
        void run(true);
      }
    };
    const onTicketUpdated = () => {
      void run(false);
    };

    window.addEventListener('ticket-updated', onTicketUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('ticket-updated', onTicketUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 17. VALIDATION
    if (!newTitle.trim()) {
      setValidationError('Subject is required');
      return;
    }
    if (selectedDepartments.length === 0) {
      setValidationError('Department is required');
      return;
    }

    const finalCategory = newCategory === 'Other' ? (customCategory.trim() || 'Other') : newCategory;
    if (!finalCategory.trim()) {
      setValidationError('Category is required');
      return;
    }
    if (!newPriority.trim()) {
      setValidationError('Priority is required');
      return;
    }
    if (!newDescription.trim()) {
      setValidationError('Description is required');
      return;
    }

    const finalDepartments = selectedDepartments.map((dept) =>
      dept === 'Other' ? (customDepartment.trim() || 'Other') : dept
    );
    const mainDepartmentStr = finalDepartments.join(' & ');

    const attachmentStrings = attachedFiles.map((f) => `${f.name} (${f.size})`);

    setIsSubmitting(true);
    try {
      await AdminApiService.createTicket({
        title: newTitle.trim(),
        category: finalCategory,
        department: mainDepartmentStr,
        departments: finalDepartments,
        priority: newPriority,
        description: newDescription.trim(),
        attachments: attachmentStrings,
        rawFiles: attachedFiles.map((f) => f.file).filter(Boolean) as File[],
        teamLeads: selectedTeamLeadObjs.map((tl) => ({
          id: tl.id,
          employeeId: tl.employeeId,
          name: tl.name,
          role: tl.role,
          email: tl.email,
        })),
        employees: selectedEmployeeObjs.map((emp) => ({
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.name,
          role: emp.role,
          email: emp.email,
        })),
      });

      // 18. NOTIFICATION
      setToastNotification({
        message: 'Ticket created successfully.',
        emailMessage: 'Email sent successfully.',
      });

      // Reset Form
      setNewTitle('');
      setNewDescription('');
      setNewCategory('Hardware');
      setCustomCategory('');
      setSelectedDepartments(['IT Support']);
      setCustomDepartment('');
      setAttachedFiles([]);
      setSelectedTeamLeadIds([]);
      setSelectedTeamLeadObjs([]);
      setSelectedEmployeeIds([]);
      setSelectedEmployeeObjs([]);
      setValidationError(null);
      setShowCreateModal(false);

      // Refresh list
      await loadData();

      // Auto-hide toast after 4 seconds
      setTimeout(() => {
        setToastNotification(null);
      }, 4000);
    } catch (err: any) {
      setValidationError(err?.message || 'Could not create ticket. Please check your selections and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUnassigned = (t: Ticket) =>
    (t as any).isUnassigned ||
    !t.assignedTo ||
    t.assignedTo.trim() === '' ||
    t.assignedTo.toLowerCase() === 'unassigned' ||
    (t as any).assignedToType === 'unassigned';

  const unassignedCount = stats?.unassignedTickets ?? tickets.filter(
    (t) => isUnassigned(t) && !['resolved', 'closed'].includes((t.status || '').toLowerCase())
  ).length;

  const escalatedCount = stats?.escalatedTickets ?? tickets.filter(
    (t) => (t.status || '').toLowerCase() === 'escalated' && !['resolved', 'closed'].includes((t.status || '').toLowerCase())
  ).length;

  const slaRiskCount = stats?.slaRiskCount ?? tickets.filter(
    (t) => (t.slaStatus || '').toLowerCase().includes('risk') && !['resolved', 'closed'].includes((t.status || '').toLowerCase())
  ).length;

  const slaBreachedCount = stats?.slaBreachedCount ?? tickets.filter(
    (t) => (t.slaStatus || '').toLowerCase().includes('breach') && !['resolved', 'closed'].includes((t.status || '').toLowerCase())
  ).length;

  const filteredTickets = tickets.filter((t) => {
    const q = filterQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      String(t.ticketNumber || '').toLowerCase().includes(q) ||
      String(t.id || '').toLowerCase().includes(q) ||
      String(t.title || '').toLowerCase().includes(q) ||
      String(t.description || '').toLowerCase().includes(q) ||
      String(t.requesterName || '').toLowerCase().includes(q) ||
      String(t.category || '').toLowerCase().includes(q) ||
      String(t.department || '').toLowerCase().includes(q) ||
      String(t.assignedTo || '').toLowerCase().includes(q) ||
      String(t.priority || '').toLowerCase().includes(q) ||
      String(t.status || '').toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'unassigned' && isUnassigned(t) && !['resolved', 'closed'].includes((t.status || '').toLowerCase())) ||
      (statusFilter === 'escalated' && (t.status || '').toLowerCase() === 'escalated' && !['resolved', 'closed'].includes((t.status || '').toLowerCase())) ||
      (statusFilter === 'sla risk' && (t.slaStatus || '').toLowerCase().includes('risk') && !['resolved', 'closed'].includes((t.status || '').toLowerCase())) ||
      (statusFilter === 'sla breached' && (t.slaStatus || '').toLowerCase().includes('breach') && !['resolved', 'closed'].includes((t.status || '').toLowerCase())) ||
      (t.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getTableInfo = () => {
    switch (statusFilter.toLowerCase()) {
      case 'unassigned':
        return {
          title: 'Unassigned Tickets',
          icon: Inbox,
          iconColor: 'text-sky-600',
          badgeVariant: 'warning' as const,
        };
      case 'escalated':
        return {
          title: 'Escalated Tickets',
          icon: AlertTriangle,
          iconColor: 'text-orange-600',
          badgeVariant: 'danger' as const,
        };
      case 'sla risk':
        return {
          title: 'SLA Risk Tickets',
          icon: Clock,
          iconColor: 'text-amber-600',
          badgeVariant: 'warning' as const,
        };
      case 'sla breached':
        return {
          title: 'SLA Breached Tickets',
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          badgeVariant: 'danger' as const,
        };
      case 'open':
        return {
          title: 'Open Tickets',
          icon: TicketIcon,
          iconColor: 'text-blue-600',
          badgeVariant: 'info' as const,
        };
      case 'in progress':
        return {
          title: 'In Progress Tickets',
          icon: Clock,
          iconColor: 'text-indigo-600',
          badgeVariant: 'info' as const,
        };
      case 'resolved':
        return {
          title: 'Resolved Tickets',
          icon: CheckCircle,
          iconColor: 'text-emerald-600',
          badgeVariant: 'success' as const,
        };
      default:
        return {
          title: 'Total Tickets',
          icon: TicketIcon,
          iconColor: 'text-[#0284C7]',
          badgeVariant: 'neutral' as const,
        };
    }
  };

  const tableInfo = getTableInfo();
  const TableTitleIcon = tableInfo.icon;

  // Never render a misleading "0" when the API failed: show a dash instead.
  const displayCount = (value: number | undefined) =>
    loadError ? '—' : value === undefined ? '—' : value;

  const ticketColumns: Column<Ticket>[] = [
    {
      header: 'Ticket ID',
      accessorKey: 'ticketNumber',
      cell: (row) => (
        <button
          onClick={() => navigate(`/admin/workspace/tickets/${row.id}`)}
          className="font-mono text-[#0284C7] font-semibold text-[12.5px] hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
          title="Click to view ticket details"
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
          <div className="text-slate-800 font-medium text-[12.5px]">{row.department}</div>
          <div className="text-[11px] text-slate-500">{row.assignedTo || 'Unassigned'}</div>
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
            onClick={() => navigate(`/admin/workspace/tickets/${row.id}`)}
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
    <div className="space-y-6 font-sans">
      {/* Toast Notification Banner */}
      {toastNotification && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-white border border-emerald-200 rounded-2xl shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300 max-w-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-900">{toastNotification.message}</div>
            {toastNotification.emailMessage && (
              <div className="text-[11px] text-emerald-700 font-medium">{toastNotification.emailMessage}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-slate-600 ml-auto cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900 tracking-tight leading-snug">Admin Dashboard</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Systemwide ticket summary and recent ticket activity.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold shrink-0 shadow-2xs"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Create Ticket
        </Button>
      </div>

      {/* Load error / retry state */}
      {loadError && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Could not load ticket data. Counts may be unavailable.
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadData()}
            className="shrink-0"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 5 Interactive Summary Cards matching Sidebar Workspace */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Tickets */}
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`bg-white border rounded-xl p-3.5 shadow-2xs flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-semibold text-slate-500">Total Tickets</span>
            <div className="p-1 bg-blue-50 text-[#0284C7] rounded-md border border-blue-100">
              <TicketIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-[22px] font-bold text-slate-900 leading-none">
              {displayCount(stats?.totalTickets ?? tickets.length)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">All workspace issues</p>
          </div>
        </button>

        {/* Unassigned Tickets */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'unassigned' ? 'all' : 'unassigned')}
          className={`bg-white border rounded-xl p-3.5 shadow-2xs flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilter === 'unassigned'
              ? 'border-sky-400 ring-2 ring-sky-500/20 bg-sky-50/30 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-semibold text-slate-500">Unassigned</span>
            <div className="p-1 bg-sky-50 text-sky-600 rounded-md border border-sky-100">
              <Inbox className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-[22px] font-bold text-sky-700 leading-none">
              {displayCount(unassignedCount)}
            </div>
            <p className="text-[11px] text-sky-600 mt-1 font-medium">Awaiting assignment</p>
          </div>
        </button>

        {/* Escalated Tickets */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'escalated' ? 'all' : 'escalated')}
          className={`bg-white border rounded-xl p-3.5 shadow-2xs flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilter === 'escalated'
              ? 'border-orange-400 ring-2 ring-orange-500/20 bg-orange-50/30 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-semibold text-slate-500">Escalated</span>
            <div className="p-1 bg-orange-50 text-orange-600 rounded-md border border-orange-100">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-[22px] font-bold text-orange-600 leading-none">
              {displayCount(escalatedCount)}
            </div>
            <p className="text-[11px] text-orange-600 mt-1 font-medium">Requires lead action</p>
          </div>
        </button>

        {/* SLA Risk */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'sla risk' ? 'all' : 'sla risk')}
          className={`bg-white border rounded-xl p-3.5 shadow-2xs flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilter === 'sla risk'
              ? 'border-amber-400 ring-2 ring-amber-500/20 bg-amber-50/30 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-semibold text-slate-500">SLA Risk</span>
            <div className="p-1 bg-amber-50 text-amber-600 rounded-md border border-amber-100">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-[22px] font-bold text-amber-600 leading-none">
              {displayCount(slaRiskCount)}
            </div>
            <p className="text-[11px] text-amber-600 mt-1 font-medium">Approaching deadline</p>
          </div>
        </button>

        {/* SLA Breached */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'sla breached' ? 'all' : 'sla breached')}
          className={`bg-white border rounded-xl p-3.5 shadow-2xs flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilter === 'sla breached'
              ? 'border-red-400 ring-2 ring-red-500/20 bg-red-50/30 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-semibold text-slate-500">SLA Breached</span>
            <div className="p-1 bg-red-50 text-red-600 rounded-md border border-red-100">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-[22px] font-bold text-red-600 leading-none">
              {displayCount(slaBreachedCount)}
            </div>
            <p className="text-[11px] text-red-600 mt-1 font-medium">Critical overdue</p>
          </div>
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder={`Filter ${tableInfo.title.toLowerCase()}...`}
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            icon={<Search className="w-3.5 h-3.5 text-slate-400" />}
          />
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            Category:
          </div>
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Total Tickets (All)' },
                { value: 'unassigned', label: 'Unassigned Tickets' },
                { value: 'escalated', label: 'Escalated Tickets' },
                { value: 'sla risk', label: 'SLA Risk Tickets' },
                { value: 'sla breached', label: 'SLA Breached Tickets' },
                { value: 'open', label: 'Open' },
                { value: 'in progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Dynamic Tickets Table Section */}
      <Card
        headerClassName="px-5 py-3.5 bg-slate-50/50 border-b border-slate-200"
        bodyClassName="p-0"
        title={
          <div className="flex items-center gap-2 flex-wrap">
            <TableTitleIcon className={`w-4 h-4 ${tableInfo.iconColor}`} />
            <span className="text-base font-semibold text-slate-900">{tableInfo.title}</span>
            <Badge variant={tableInfo.badgeVariant} className="text-[11px] py-0.5 px-2">
              {filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'}
            </Badge>
            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="text-xs text-[#0284C7] hover:underline font-medium ml-2 cursor-pointer"
              >
                (Show All)
              </button>
            )}
          </div>
        }
      >
        <Table
          columns={ticketColumns}
          data={filteredTickets}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyMessage={`No ${tableInfo.title.toLowerCase()} match your criteria.`}
          compact
        />
      </Card>

      {/* Admin Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-4 max-h-[92vh] animate-in zoom-in-95 duration-150">
            {/* Fixed Header */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sky-100 text-[#0284C7] font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Create Support Ticket (Admin)</h2>
                  <p className="text-xs text-slate-500">Route tickets to departments and assign to team leads or members</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {validationError && (
              <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold flex items-center gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {validationError}
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1 font-sans">
              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ticket subject..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              {/* Department Selection (Multiple Departments Supported) */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Department Selection <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Select one or more departments
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {departmentOptions.map((dept) => {
                    const isSelected = selectedDepartments.includes(dept);
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => toggleDepartment(dept)}
                        className={`flex items-center gap-2 p-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50 border-[#0284C7] text-[#0284C7] shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[#0284C7] border-[#0284C7] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="truncate">{dept}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Type Department custom field if "Other" selected */}
                {isOtherDeptSelected && (
                  <div className="mt-3 pt-3 border-t border-slate-200/70">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Type Department <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="Type custom department name..."
                      value={customDepartment}
                      onChange={(e) => setCustomDepartment(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Team Lead & Employee Selection Component */}
              <TeamLeadEmployeeSelector
                role="admin"
                selectedDepartments={activeDepartments}
                selectedTeamLeadIds={selectedTeamLeadIds}
                selectedEmployeeIds={selectedEmployeeIds}
                onSelectedTeamLeadsChange={(ids, objs) => {
                  setSelectedTeamLeadIds(ids);
                  setSelectedTeamLeadObjs(objs);
                }}
                onSelectedEmployeesChange={(ids, objs) => {
                  setSelectedEmployeeIds(ids);
                  setSelectedEmployeeObjs(objs);
                }}
              />

              {/* Category Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <Select
                  value={newCategory}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCategory(val);
                    if (val !== 'Other') {
                      setCustomCategory('');
                    }
                  }}
                  options={[
                    { value: 'Hardware', label: 'Hardware' },
                    { value: 'Software', label: 'Software' },
                    { value: 'Network', label: 'Network' },
                    { value: 'Access Issue', label: 'Access Issue' },
                    { value: 'Email', label: 'Email' },
                    { value: 'Application', label: 'Application' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
                {newCategory === 'Other' && (
                  <div className="mt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Type Category <span className="text-red-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="Type custom category name..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                <Select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  options={[
                    { value: 'Critical', label: 'Critical' },
                    { value: 'High', label: 'High' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'Low', label: 'Low' },
                  ]}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Enter detailed ticket description..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              {/* Attachment File Picker */}
              <AttachmentFilePicker
                files={attachedFiles}
                onFilesChange={setAttachedFiles}
                label="Attachments (Optional)"
                buttonText="Browse Local Computer Files"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="border-slate-200 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || !newTitle.trim() || !newDescription.trim() || selectedDepartments.length === 0}
                  className="bg-[#0284C7] text-white font-semibold"
                >
                  {isSubmitting ? 'Creating...' : 'Create Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
