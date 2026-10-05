import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Table, type Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import type { Ticket, User } from '../../types';
import { AdminApiService } from '../../services/api';
import { ShieldAlert, CheckCircle2, UserCheck, Bell, AlertOctagon } from 'lucide-react';

export const SLABreachedPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newAssignee, setNewAssignee] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ type: 'success'; message: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [ticketData, userData] = await Promise.all([
      AdminApiService.getTickets('sla-breached'),
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
    setNewAssignee(ticket.assignedTo || '');
    setReasonNote('');
  };

  const handleCloseModal = () => {
    setSelectedTicket(null);
  };

  const handleEmergencyReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newAssignee) return;

    setIsSubmitting(true);
    const logText = `Emergency Reassign: Ticket transferred from ${selectedTicket.assignedTo || 'Unassigned'} to ${newAssignee}.${reasonNote ? ` Reason: ${reasonNote}` : ''}`;

    // Update assignee while retaining SLA Breached status
    await AdminApiService.updateTicket(
      selectedTicket.id,
      { assignedTo: newAssignee, slaStatus: 'SLA Breached' },
      logText
    );

    setToast({
      type: 'success',
      message: `Emergency Reassignment Complete! Ticket ${selectedTicket.ticketNumber} assigned to ${newAssignee}. New assignee and Team Lead notified.`
    });

    setIsSubmitting(false);
    handleCloseModal();
    loadData();
  };

  const staffUsers = users.filter((u) => u.status === 'Active');
  const staffOptions = [
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
      header: 'Assigned Employee',
      cell: (row) => <span className="text-[13px] text-slate-800 font-medium">{row.assignedTo || 'Unassigned'}</span>
    },
    {
      header: 'Overdue Deadline',
      cell: (row) => <span className="text-[12.5px] text-red-600 font-mono font-bold">{row.dueDate}</span>
    },
    {
      header: 'Status',
      cell: () => <Badge variant="danger" dot className="text-[11px]">SLA Breached</Badge>
    },
    {
      header: 'Action',
      cell: (row) => (
        <Button
          variant="danger"
          size="sm"
          className="text-[12px]"
          onClick={() => handleOpenModal(row)}
        >
          Emergency Reassign
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
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="danger" className="text-[11.5px]">High Severity SLA Default</Badge>
            <span className="text-[12px] text-red-700 font-medium">{tickets.length} Critical Breaches</span>
          </div>
          <h1 className="text-[26px] font-bold text-slate-900 tracking-tight mt-0.5 mb-0">SLA Breached Tickets</h1>
          <p className="text-[13px] text-slate-600 mt-0.5">Tickets that exceeded maximum resolution deadline policies.</p>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <Table columns={columns} data={tickets} keyExtractor={(row) => row.id} isLoading={isLoading} />
      </Card>

      {/* Emergency Reassign Modal */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={handleCloseModal}
          title={`Emergency Reassign — ${selectedTicket.ticketNumber}`}
          subtitle={selectedTicket.title}
          maxWidth="md"
        >
          <form onSubmit={handleEmergencyReassignSubmit} className="space-y-4">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-1 text-red-900">
              <div className="flex items-center gap-2 font-semibold text-xs text-red-800">
                <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
                Emergency Reassignment Protocol
              </div>
              <p className="text-xs text-red-700">
                This ticket has exceeded SLA limits. Reassigning will transfer immediate ownership to the new employee while retaining SLA Breached audit status.
              </p>
            </div>

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
                options={staffOptions}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Reassignment Reason / Notes *
              </label>
              <textarea
                rows={3}
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                placeholder="Explain the reason for emergency reassignment..."
                required
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
              />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
              <Bell className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>Submitting will immediately notify the new assignee and dispatch an alert to the Department Team Lead.</span>
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
        </Modal>
      )}
    </div>
  );
};
