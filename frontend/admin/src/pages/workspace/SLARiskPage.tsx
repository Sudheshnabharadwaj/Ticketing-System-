import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Table, type Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import type { Ticket, User } from '../../types';
import { AdminApiService } from '../../services/api';
import { Clock, CheckCircle2, UserCheck, AlertTriangle, Bell, Zap } from 'lucide-react';

export const SLARiskPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal & Intervention states
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [actionType, setActionType] = useState<'reassign' | 'escalate' | 'notify'>('reassign');
  const [newAssignee, setNewAssignee] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [teamLeadName, setTeamLeadName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ type: 'success'; message: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [ticketData, userData] = await Promise.all([
      AdminApiService.getTickets('sla-risk'),
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
    setActionType('reassign');
    setNewAssignee(ticket.assignedTo || '');
    setReasonNote('');
    const teamLead = users.find((u) => u.role === 'Team Lead' && u.department === ticket.department) || users.find((u) => u.role === 'Team Lead');
    setTeamLeadName(teamLead ? teamLead.name : 'Manikanta');
  };

  const handleCloseModal = () => {
    setSelectedTicket(null);
  };

  const handleSubmitIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setIsSubmitting(true);

    if (actionType === 'reassign') {
      if (!newAssignee) {
        setIsSubmitting(false);
        return;
      }
      const logMessage = `SLA Intervention: Reassigned from ${selectedTicket.assignedTo || 'Unassigned'} to ${newAssignee}.${reasonNote ? ` Reason: ${reasonNote}` : ''}`;
      await AdminApiService.updateTicket(selectedTicket.id, { assignedTo: newAssignee }, logMessage);
      setToast({
        type: 'success',
        message: `SLA Intervention applied! Ticket ${selectedTicket.ticketNumber} reassigned to ${newAssignee}. Notifications sent.`
      });
    } else if (actionType === 'escalate') {
      const logMessage = `SLA Intervention: Escalated priority to Urgent & status to Escalated.${reasonNote ? ` Note: ${reasonNote}` : ''}`;
      await AdminApiService.updateTicket(
        selectedTicket.id,
        { priority: 'Urgent', status: 'Escalated' },
        logMessage
      );
      setToast({
        type: 'success',
        message: `SLA Intervention applied! Ticket ${selectedTicket.ticketNumber} escalated to Urgent status. Team Lead notified.`
      });
    } else if (actionType === 'notify') {
      const logMessage = `SLA Intervention: Urgent warning alert sent to Team Lead (${teamLeadName}).${reasonNote ? ` Note: ${reasonNote}` : ''}`;
      await AdminApiService.updateTicket(selectedTicket.id, {}, logMessage);
      setToast({
        type: 'success',
        message: `SLA Warning notification dispatched to Team Lead ${teamLeadName} for Ticket ${selectedTicket.ticketNumber}.`
      });
    }

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

  const teamLeads = users.filter((u) => u.role === 'Team Lead' || u.role === 'Admin');
  const teamLeadOptions = teamLeads.map((tl) => ({
    value: tl.name,
    label: `${tl.name} (${tl.department} Lead)`
  }));

  const columns: Column<Ticket>[] = [
    {
      header: 'Ticket ID',
      cell: (row) => <span className="font-mono text-amber-700 font-bold text-[12.5px]">{row.ticketNumber}</span>
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
      cell: (row) => <span className="text-[13px] text-slate-800 font-medium">{row.requesterName}</span>
    },
    {
      header: 'Current Assignee',
      cell: (row) => <span className="text-[12.5px] text-slate-700 font-medium">{row.assignedTo || 'Unassigned'}</span>
    },
    {
      header: 'Target Deadline',
      cell: (row) => <span className="text-[12.5px] text-amber-700 font-semibold font-mono">{row.dueDate}</span>
    },
    {
      header: 'Priority',
      cell: (row) => <Badge variant="warning" dot className="text-[11px]">{row.priority}</Badge>
    },
    {
      header: 'Action',
      cell: (row) => (
        <Button
          variant="secondary"
          size="sm"
          className="text-[12px] hover:bg-amber-100 hover:text-amber-800 border-amber-300"
          onClick={() => handleOpenModal(row)}
        >
          Speed Up SLA
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
      <div className="flex items-center gap-3 bg-amber-50/70 border border-amber-200 p-4 rounded-xl">
        <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg border border-amber-200 shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="warning" className="text-[11.5px]">SLA Warning</Badge>
            <span className="text-[12px] text-amber-800 font-medium">Approaching breach threshold within 1 hour</span>
          </div>
          <h1 className="text-[26px] font-bold text-slate-900 tracking-tight mt-0.5 mb-0">SLA Risk Tickets</h1>
          <p className="text-[13px] text-slate-600 mt-0.5">Tickets requiring priority dispatch to prevent SLA default.</p>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <Table columns={columns} data={tickets} keyExtractor={(row) => row.id} isLoading={isLoading} />
      </Card>

      {/* SLA Intervention Modal */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          onClose={handleCloseModal}
          title={`SLA Intervention — ${selectedTicket.ticketNumber}`}
          subtitle="Speed up execution to prevent SLA breach"
          maxWidth="md"
        >
          <form onSubmit={handleSubmitIntervention} className="space-y-5">
            {/* Ticket Info Card */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-amber-800 font-medium">Ticket ID:</span>{' '}
                  <strong className="font-mono text-slate-900">{selectedTicket.ticketNumber}</strong>
                </div>
                <div>
                  <span className="text-amber-800 font-medium">Current Assignee:</span>{' '}
                  <strong className="text-slate-900">{selectedTicket.assignedTo || 'Unassigned'}</strong>
                </div>
                <div>
                  <span className="text-amber-800 font-medium">Priority:</span>{' '}
                  <Badge variant="warning" className="text-[10px]">{selectedTicket.priority}</Badge>
                </div>
                <div>
                  <span className="text-amber-800 font-medium">SLA Deadline:</span>{' '}
                  <span className="font-mono font-semibold text-amber-900">{selectedTicket.dueDate}</span>
                </div>
              </div>
              <div className="pt-1 flex items-center gap-1.5 text-xs text-amber-900 font-medium border-t border-amber-200/60">
                <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse shrink-0" />
                <span>Remaining SLA Time: ~45 mins remaining before breach threshold.</span>
              </div>
            </div>

            {/* Action Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-2">
                Choose Intervention Action:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActionType('reassign')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    actionType === 'reassign'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-semibold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs mb-1">
                    <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                    Reassign
                  </div>
                  <div className="text-[11px] text-slate-500 font-normal">Pass to available employee</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('escalate')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    actionType === 'escalate'
                      ? 'border-red-500 bg-red-50 text-red-900 font-semibold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs mb-1">
                    <Zap className="w-3.5 h-3.5 text-red-600" />
                    Escalate
                  </div>
                  <div className="text-[11px] text-slate-500 font-normal">Elevate to Urgent status</div>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('notify')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    actionType === 'notify'
                      ? 'border-blue-500 bg-blue-50 text-blue-900 font-semibold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs mb-1">
                    <Bell className="w-3.5 h-3.5 text-blue-600" />
                    Notify Lead
                  </div>
                  <div className="text-[11px] text-slate-500 font-normal">Alert Team Lead</div>
                </button>
              </div>
            </div>

            {/* Dynamic Action Details */}
            {actionType === 'reassign' && (
              <div className="space-y-3 p-3.5 border border-slate-200 rounded-xl bg-slate-50/50">
                <Select
                  label="Select New Employee / Team Lead *"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  options={staffOptions}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Intervention Reason</label>
                  <textarea
                    rows={2}
                    value={reasonNote}
                    onChange={(e) => setReasonNote(e.target.value)}
                    placeholder="Reason for reassignment..."
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {actionType === 'escalate' && (
              <div className="space-y-3 p-3.5 border border-red-200 bg-red-50/40 rounded-xl">
                <div className="flex items-start gap-2 text-xs text-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>
                    Escalating will raise ticket priority to <strong>Urgent</strong> and set status to <strong>Escalated</strong>, signaling immediate action required.
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Escalation Note</label>
                  <textarea
                    rows={2}
                    value={reasonNote}
                    onChange={(e) => setReasonNote(e.target.value)}
                    placeholder="Provide details on SLA escalation urgency..."
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-red-500"
                  />
                </div>
              </div>
            )}

            {actionType === 'notify' && (
              <div className="space-y-3 p-3.5 border border-blue-200 bg-blue-50/40 rounded-xl">
                <Select
                  label="Target Team Lead *"
                  value={teamLeadName}
                  onChange={(e) => setTeamLeadName(e.target.value)}
                  options={teamLeadOptions}
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notification Message</label>
                  <textarea
                    rows={2}
                    value={reasonNote}
                    onChange={(e) => setReasonNote(e.target.value)}
                    placeholder="Urgent SLA risk alert details..."
                    className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white border-none"
              >
                {isSubmitting ? 'Applying...' : 'Apply SLA Intervention'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
