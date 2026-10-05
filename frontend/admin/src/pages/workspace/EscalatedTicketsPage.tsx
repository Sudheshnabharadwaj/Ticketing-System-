import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Table, type Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import type { Ticket, User } from '../../types';
import { AdminApiService } from '../../services/api';
import { AlertTriangle, ArrowUpRight, CheckCircle2, UserCheck, Bell } from 'lucide-react';

export const EscalatedTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal & Action states
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<'reassign' | 'resolve'>('reassign');
  const [newAssignee, setNewAssignee] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [ticketData, userData] = await Promise.all([
      AdminApiService.getTickets('escalated'),
      AdminApiService.getUsers()
    ]);
    setTickets(ticketData);
    setUsers(userData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setActiveTab('reassign');
    setNewAssignee(ticket.assignedTo || '');
    setReassignReason('');
    setResolveNotes('');
  };

  const handleCloseModal = () => {
    setSelectedTicket(null);
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newAssignee) return;

    setIsSubmitting(true);
    const logText = `Ticket reassigned from ${selectedTicket.assignedTo || 'Unassigned'} to ${newAssignee}.${reassignReason ? ` Reason: ${reassignReason}` : ''}`;
    
    await AdminApiService.updateTicket(selectedTicket.id, { assignedTo: newAssignee }, logText);

    setToast({
      type: 'success',
      message: `Ticket ${selectedTicket.ticketNumber} reassigned to ${newAssignee}. Notifications sent to new assignee & Team Lead.`
    });

    setIsSubmitting(false);
    handleCloseModal();
    loadData();
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setIsSubmitting(true);
    const logText = `Ticket marked as Resolved by Admin.${resolveNotes ? ` Resolution notes: ${resolveNotes}` : ''}`;

    await AdminApiService.updateTicket(selectedTicket.id, { status: 'Resolved' }, logText);

    setToast({
      type: 'success',
      message: `Ticket ${selectedTicket.ticketNumber} has been resolved successfully.`
    });

    setIsSubmitting(false);
    handleCloseModal();
    loadData();
  };

  // Active staff users options for Select component
  const staffUsers = users.filter((u) => u.status === 'Active');
  const assigneeOptions = [
    { value: '', label: 'Select Employee or Team Lead...' },
    ...staffUsers.map((u) => ({
      value: u.name,
      label: `${u.name} (${u.role} - ${u.department})`
    }))
  ];

  const columns: Column<Ticket>[] = [
    {
      header: 'Ticket ID',
      cell: (row) => <span className="font-mono text-red-600 font-bold text-[12.5px]">{row.ticketNumber}</span>
    },
    {
      header: 'Title & Category',
      cell: (row) => (
        <div>
          <div className="font-medium text-slate-900 text-[13px]">{row.title}</div>
          <div className="text-[12px] text-slate-500">{row.category} • {row.department}</div>
        </div>
      )
    },
    {
      header: 'Requester',
      cell: (row) => (
        <div>
          <div className="text-slate-800 font-medium text-[13px]">{row.requesterName}</div>
          <div className="text-[12px] text-slate-500">{row.requesterEmail}</div>
        </div>
      )
    },
    {
      header: 'Current Assignee',
      cell: (row) => <span className="text-[12.5px] text-amber-700 font-medium">{row.assignedTo || 'Unassigned'}</span>
    },
    {
      header: 'Priority',
      cell: (row) => <Badge variant="danger" dot className="text-[11px]">{row.priority}</Badge>
    },
    {
      header: 'SLA Status',
      cell: (row) => {
        const variant = row.slaStatus === 'SLA Breached' ? 'danger' : 'warning';
        return <Badge variant={variant} className="text-[11px]">{row.slaStatus}</Badge>;
      }
    },
    {
      header: 'Actions',
      cell: (row) => (
        <Button
          variant="danger"
          size="sm"
          icon={<ArrowUpRight className="w-3.5 h-3.5" />}
          className="text-[12px]"
          onClick={() => handleOpenModal(row)}
        >
          Reassign / Resolve
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="flex items-center justify-between p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex items-center gap-3 bg-red-50/60 border border-red-200 p-4 rounded-xl">
        <div className="p-2.5 bg-red-100 text-red-700 rounded-lg border border-red-200 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="danger" className="text-[11.5px]">Escalations Desk</Badge>
            <span className="text-[12px] text-slate-600 font-medium">{tickets.length} Active Escalations</span>
          </div>
          <h1 className="text-[26px] font-bold text-slate-900 tracking-tight mt-0.5 mb-0">Escalated Tickets</h1>
          <p className="text-[13px] text-slate-600 mt-0.5">High-priority tickets handed off to Admins & Team Leads.</p>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <Table columns={columns} data={tickets} keyExtractor={(row) => row.id} isLoading={isLoading} />
      </Card>

      {/* Action Modal */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={handleCloseModal}
          title={`Escalation Action — ${selectedTicket.ticketNumber}`}
          subtitle={selectedTicket.title}
          maxWidth="md"
        >
          <div className="space-y-5">
            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('reassign')}
                className={`pb-2.5 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'reassign'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                🔄 Reassign Ticket
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('resolve')}
                className={`pb-2.5 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'resolve'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                ✅ Resolve Ticket
              </button>
            </div>

            {/* Reassign Tab Form */}
            {activeTab === 'reassign' && (
              <form onSubmit={handleReassignSubmit} className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Assignee</div>
                  <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-slate-500" />
                    {selectedTicket.assignedTo || 'Unassigned'}
                  </div>
                </div>

                <div>
                  <Select
                    label="Select New Employee / Team Lead *"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    options={assigneeOptions}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason / Reassignment Comment
                  </label>
                  <textarea
                    rows={3}
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    placeholder="Provide context for the reassignment..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                  <Bell className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>Submitting will update the ticket assignee, add an activity log entry, and notify the new assignee and Team Lead.</span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="danger" disabled={isSubmitting}>
                    {isSubmitting ? 'Reassigning...' : 'Reassign Ticket'}
                  </Button>
                </div>
              </form>
            )}

            {/* Resolve Tab Form */}
            {activeTab === 'resolve' && (
              <form onSubmit={handleResolveSubmit} className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-900">
                  <div className="flex items-center gap-2 font-semibold text-sm text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Are you sure you want to resolve this ticket?
                  </div>
                  <p className="text-xs text-emerald-700">
                    Ticket <strong>{selectedTicket.ticketNumber}</strong> will be marked as Resolved, closing out active escalation.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resolution Details / Comment (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    placeholder="Describe how this escalated ticket was resolved..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={handleCloseModal}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {isSubmitting ? 'Resolving...' : 'Resolve Ticket'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
