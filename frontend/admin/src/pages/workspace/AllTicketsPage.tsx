import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Table, type Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { Ticket, TicketPriority, TicketStatus } from '../../types';
import { AdminApiService } from '../../services/api';
import { Search, RefreshCw, Eye, Edit2, Trash2, AlertTriangle, X } from 'lucide-react';

export const AllTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Edit Ticket Modal State
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [editFormData, setEditFormData] = useState<{
    title: string;
    description: string;
    department: string;
    priority: TicketPriority;
    status: TicketStatus;
    assignedTo: string;
  }>({
    title: '',
    description: '',
    department: 'IT Support',
    priority: 'Medium',
    status: 'Open',
    assignedTo: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Ticket Modal State
  const [deletingTicket, setDeletingTicket] = useState<Ticket | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const data = await AdminApiService.getTickets('all');
      setTickets(data || []);
    } catch (e) {
      console.error('Error fetching tickets:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    let result = tickets;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        t => t.ticketNumber.toLowerCase().includes(q) ||
             t.title.toLowerCase().includes(q) ||
             t.requesterName.toLowerCase().includes(q) ||
             t.category.toLowerCase().includes(q)
      );
    }

    if (departmentFilter !== 'all') {
      const df = departmentFilter.toLowerCase();
      result = result.filter(t => {
        const d = (t.department || '').toLowerCase();
        return d === df || d.includes(df);
      });
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

  const handleOpenEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
    setEditFormData({
      title: ticket.title || '',
      description: ticket.description || '',
      department: ticket.department || 'IT Support',
      priority: ticket.priority || 'Medium',
      status: ticket.status || 'Open',
      assignedTo: ticket.assignedTo || '',
    });
  };

  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;
    setIsSavingEdit(true);
    try {
      const updated = await AdminApiService.updateTicket(
        editingTicket.id,
        {
          title: editFormData.title,
          description: editFormData.description,
          department: editFormData.department,
          priority: editFormData.priority,
          status: editFormData.status,
          assignedTo: editFormData.assignedTo || 'Unassigned',
        },
        'Admin edited ticket details from All Tickets directory'
      );
      setTickets(prev => prev.map(t => (t.id === editingTicket.id ? { ...t, ...updated } : t)));
      setEditingTicket(null);
    } catch (err) {
      console.error('Failed to update ticket:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTicket) return;
    setIsDeleting(true);
    try {
      const success = await AdminApiService.deleteTicket(deletingTicket.id);
      if (success) {
        setTickets(prev => prev.filter(t => t.id !== deletingTicket.id));
      }
      setDeletingTicket(null);
    } catch (err) {
      console.error('Failed to delete ticket:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Ticket>[] = [
    {
      header: 'Ticket ID',
      accessorKey: 'ticketNumber',
      cell: (row) => (
        <button
          onClick={() => navigate(`/admin/workspace/tickets/${row.id}?from=all-tickets`)}
          className="font-mono text-[#2563EB] font-semibold text-[12.5px] hover:underline text-left cursor-pointer"
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
        const variant = row.priority === 'Urgent' ? 'danger' : row.priority === 'High' ? 'warning' : 'neutral';
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
      cell: (row) => <span className="text-[11.5px] text-slate-500">{row.updatedAt || row.createdAt}</span>
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => navigate(`/admin/workspace/tickets/${row.id}?from=all-tickets`)}
            title="View details"
          >
            View
          </Button>
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#0284C7] hover:bg-sky-50 transition-colors cursor-pointer"
            title="Edit ticket"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeletingTicket(row)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete ticket"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
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
          onClick={fetchTickets}
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
              onChange={(e) => setSearch(e.target.value)}
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
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredTickets}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
        />
      </Card>

      {/* Edit Ticket Modal */}
      {editingTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 font-sans space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#0284C7]" />
                <h3 className="text-base font-bold text-slate-900">
                  Edit Ticket ({editingTicket.ticketNumber})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTicket(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subject / Title</label>
                <Input
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Ticket Subject"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <Select
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    options={[
                      { value: 'IT Support', label: 'IT Support' },
                      { value: 'HR', label: 'HR' },
                      { value: 'Finance', label: 'Finance' },
                      { value: 'Operations', label: 'Operations' },
                      { value: 'Sales', label: 'Sales' },
                      { value: 'Marketing', label: 'Marketing' },
                      { value: 'Legal', label: 'Legal' },
                      { value: 'Facilities', label: 'Facilities' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <Select
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as TicketPriority })}
                    options={[
                      { value: 'Low', label: 'Low' },
                      { value: 'Medium', label: 'Medium' },
                      { value: 'High', label: 'High' },
                      { value: 'Urgent', label: 'Urgent' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <Select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as TicketStatus })}
                    options={[
                      { value: 'Open', label: 'Open' },
                      { value: 'In Progress', label: 'In Progress' },
                      { value: 'Escalated', label: 'Escalated' },
                      { value: 'Resolved', label: 'Resolved' },
                      { value: 'Closed', label: 'Closed' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Agent / Team</label>
                  <Input
                    value={editFormData.assignedTo}
                    onChange={(e) => setEditFormData({ ...editFormData, assignedTo: e.target.value })}
                    placeholder="Assigned Agent Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Ticket description details..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTicket(null)}
                  className="border-slate-200 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSavingEdit}
                  className="bg-[#0284C7] text-white font-semibold"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Ticket Confirmation Modal */}
      {deletingTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 font-sans space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Ticket</h3>
                <p className="text-xs text-slate-500 font-medium">Permanent action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete ticket <strong className="text-slate-900 font-semibold">{deletingTicket.ticketNumber}</strong> ({deletingTicket.title})? This will remove all associated activities, comments, and attachments.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingTicket(null)}
                className="border-slate-200 text-slate-600 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete Ticket'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


