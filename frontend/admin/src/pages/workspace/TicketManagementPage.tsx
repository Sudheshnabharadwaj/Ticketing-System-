import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { Ticket, TicketPriority, TicketStatus } from '../../types';
import { AdminApiService } from '../../services/api';
import {
  Search,
  RefreshCw,
  UserCheck,
  AlertTriangle,
  Clock,
  Send,
  X,
  Paperclip,
  Inbox,
  Hourglass
} from 'lucide-react';

export const TicketManagementPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeQueueTab, setActiveQueueTab] = useState<'all' | 'unassigned' | 'in_progress' | 'pending' | 'escalated'>('all');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');

  // Drawer / Modal states
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [actionModalType, setActionModalType] = useState<'assign' | 'reassign' | 'status' | 'priority' | 'escalate' | null>(null);

  // Modal form values
  const [modalAssignee, setModalAssignee] = useState('');
  const [modalStatus, setModalStatus] = useState<TicketStatus>('In Progress');
  const [modalPriority, setModalPriority] = useState<TicketPriority>('High');
  const [modalNote, setModalNote] = useState('');
  const [newComment, setNewComment] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    const data = await AdminApiService.getTickets('all');
    setTickets(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter logic
  const filteredTickets = tickets.filter((t) => {
    // Queue Tabs filter
    if (activeQueueTab === 'unassigned' && (t.assignedTo || t.status === 'Resolved' || t.status === 'Closed')) return false;
    if (activeQueueTab === 'in_progress' && t.status !== 'In Progress') return false;
    if (activeQueueTab === 'pending' && t.status !== 'Pending') return false;
    if (activeQueueTab === 'escalated' && t.status !== 'Escalated') return false;

    // Compact filters
    const matchesSearch =
      !searchQuery ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.requesterName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = deptFilter === 'all' || t.department.toLowerCase() === deptFilter.toLowerCase();
    const matchesPriority = priorityFilter === 'all' || t.priority.toLowerCase() === priorityFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || t.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesAssignee =
      assigneeFilter === 'all'
        ? true
        : assigneeFilter === 'unassigned'
        ? !t.assignedTo
        : t.assignedTo?.toLowerCase() === assigneeFilter.toLowerCase();
    const matchesSla = slaFilter === 'all' || t.slaStatus.toLowerCase().replace(' ', '_') === slaFilter.toLowerCase();

    return matchesSearch && matchesDept && matchesPriority && matchesStatus && matchesAssignee && matchesSla;
  });

  // Count stats
  const countUnassigned = tickets.filter((t) => !t.assignedTo && t.status !== 'Closed' && t.status !== 'Resolved').length;
  const countInProgress = tickets.filter((t) => t.status === 'In Progress').length;
  const countPending = tickets.filter((t) => t.status === 'Pending').length;
  const countEscalated = tickets.filter((t) => t.status === 'Escalated').length;

  const handleOpenActionModal = (ticket: Ticket, type: 'assign' | 'reassign' | 'status' | 'priority' | 'escalate') => {
    setSelectedTicket(ticket);
    setActionModalType(type);
    setModalAssignee(ticket.assignedTo || 'Kotesh Goud');
    setModalStatus(ticket.status);
    setModalPriority(ticket.priority);
    setModalNote('');
  };

  const handleSaveActionModal = () => {
    if (!selectedTicket || !actionModalType) return;

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== selectedTicket.id) return t;
        let updated = { ...t };
        if (actionModalType === 'assign' || actionModalType === 'reassign') {
          updated.assignedTo = modalAssignee;
          if (updated.status === 'Open') updated.status = 'In Progress';
        } else if (actionModalType === 'status') {
          updated.status = modalStatus;
        } else if (actionModalType === 'priority') {
          updated.priority = modalPriority;
        } else if (actionModalType === 'escalate') {
          updated.status = 'Escalated';
          updated.priority = 'Urgent';
        }
        return updated;
      })
    );

    setActionModalType(null);
  };

  const handleOpenDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailDrawerOpen(true);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedTicket) return;
    const commentObj = {
      id: `c-${Date.now()}`,
      author: 'Sudheshna Bharadwaj (Admin)',
      text: newComment.trim(),
      timestamp: 'Just now'
    };
    const updated = {
      ...selectedTicket,
      history: [...(selectedTicket.history || []), commentObj]
    };
    setSelectedTicket(updated);
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setNewComment('');
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-[26px] font-bold text-slate-900 tracking-tight leading-snug">Ticket Management</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Manage, assign and process tickets across departments.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          className="text-xs"
        >
          Refresh Queue
        </Button>
      </div>

      {/* Queue Tabs / Action Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveQueueTab(activeQueueTab === 'unassigned' ? 'all' : 'unassigned')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeQueueTab === 'unassigned'
              ? 'bg-blue-50 border-[#0284C7] ring-2 ring-[#0284C7]/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Unassigned</span>
            <Inbox className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">{countUnassigned}</div>
          <span className="text-[11px] text-slate-500 font-medium">Awaiting assignment</span>
        </button>

        <button
          onClick={() => setActiveQueueTab(activeQueueTab === 'in_progress' ? 'all' : 'in_progress')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeQueueTab === 'in_progress'
              ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">In Progress</span>
            <Hourglass className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">{countInProgress}</div>
          <span className="text-[11px] text-slate-500 font-medium">Actively working</span>
        </button>

        <button
          onClick={() => setActiveQueueTab(activeQueueTab === 'pending' ? 'all' : 'pending')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeQueueTab === 'pending'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">{countPending}</div>
          <span className="text-[11px] text-slate-500 font-medium">Waiting on requester</span>
        </button>

        <button
          onClick={() => setActiveQueueTab(activeQueueTab === 'escalated' ? 'all' : 'escalated')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeQueueTab === 'escalated'
              ? 'bg-red-50 border-red-500 ring-2 ring-red-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Escalated</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">{countEscalated}</div>
          <span className="text-[11px] text-slate-500 font-medium">Requires lead action</span>
        </button>
      </div>

      {/* Compact Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-2 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0284C7]"
          />
        </div>

        {/* Department Filter */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#0284C7] cursor-pointer"
        >
          <option value="all">Department: All</option>
          <option value="IT Support">IT Support</option>
          <option value="HR">HR</option>
          <option value="Finance">Finance</option>
          <option value="Operations">Operations</option>
          <option value="Sales">Sales</option>
          <option value="Legal">Legal</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#0284C7] cursor-pointer"
        >
          <option value="all">Priority: All</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#0284C7] cursor-pointer"
        >
          <option value="all">Status: All</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Pending">Pending</option>
          <option value="Escalated">Escalated</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>

        {/* Assignee Filter */}
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#0284C7] cursor-pointer"
        >
          <option value="all">Assignee: All</option>
          <option value="unassigned">Unassigned</option>
          <option value="Kotesh Goud">Kotesh Goud</option>
          <option value="aditya">aditya</option>
          <option value="Hyma">Hyma</option>
        </select>

        {/* SLA Filter */}
        <select
          value={slaFilter}
          onChange={(e) => setSlaFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-[#0284C7] cursor-pointer"
        >
          <option value="all">SLA: All</option>
          <option value="normal">On Track</option>
          <option value="sla_risk">SLA Risk</option>
          <option value="sla_breached">SLA Breached</option>
        </select>

        {/* Clear Filters */}
        {(searchQuery || deptFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all' || assigneeFilter !== 'all' || slaFilter !== 'all' || activeQueueTab !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setDeptFilter('all');
              setPriorityFilter('all');
              setStatusFilter('all');
              setAssigneeFilter('all');
              setSlaFilter('all');
              setActiveQueueTab('all');
            }}
            className="text-xs text-[#0284C7] hover:underline px-2 py-1 cursor-pointer font-medium"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Actionable Ticket Table */}
      <Card bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                <th className="py-3 px-3">Ticket ID</th>
                <th className="py-3 px-3">Subject</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Assigned To</th>
                <th className="py-3 px-3">SLA</th>
                <th className="py-3 px-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                    Loading work queue...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                    No matching tickets found in this queue.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Ticket ID */}
                    <td className="py-3 px-3 font-mono font-semibold text-[#0284C7]">
                      <button
                        onClick={() => handleOpenDetail(t)}
                        className="hover:underline cursor-pointer text-left bg-transparent border-none p-0"
                      >
                        {t.ticketNumber}
                      </button>
                    </td>

                    {/* Subject */}
                    <td className="py-3 px-3 max-w-[220px]">
                      <div className="font-semibold text-slate-900 truncate" title={t.title}>
                        {t.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{t.requesterName}</div>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-3 font-medium text-slate-700">{t.department}</td>

                    {/* Priority */}
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          t.priority === 'Urgent'
                            ? 'danger'
                            : t.priority === 'High'
                            ? 'warning'
                            : 'neutral'
                        }
                        dot
                        className="text-[10.5px] py-0.5 px-2"
                      >
                        {t.priority}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          t.status === 'Escalated'
                            ? 'danger'
                            : t.status === 'In Progress'
                            ? 'info'
                            : t.status === 'Pending'
                            ? 'warning'
                            : t.status === 'Resolved'
                            ? 'success'
                            : 'neutral'
                        }
                        className="text-[10.5px] py-0.5 px-2"
                      >
                        {t.status}
                      </Badge>
                    </td>

                    {/* Assigned To */}
                    <td className="py-3 px-3">
                      {t.assignedTo ? (
                        <span className="font-medium text-slate-800 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {t.assignedTo}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10.5px]">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* SLA */}
                    <td className="py-3 px-3">
                      <span
                        className={`font-semibold text-[10.5px] px-2 py-0.5 rounded ${
                          t.slaStatus === 'SLA Breached'
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : t.slaStatus === 'SLA Risk'
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t.slaStatus}
                      </span>
                    </td>

                    {/* Updated */}
                    <td className="py-3 px-3 text-slate-500 text-[11px] whitespace-nowrap">{t.createdAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ACTION MODAL (Assign / Reassign / Status / Priority / Escalate) */}
      {actionModalType && selectedTicket && (
        <Modal
          isOpen={true}
          onClose={() => setActionModalType(null)}
          title={
            actionModalType === 'assign'
              ? `Assign Ticket #${selectedTicket.ticketNumber}`
              : actionModalType === 'reassign'
              ? `Reassign Ticket #${selectedTicket.ticketNumber}`
              : actionModalType === 'status'
              ? `Change Status for #${selectedTicket.ticketNumber}`
              : actionModalType === 'priority'
              ? `Change Priority for #${selectedTicket.ticketNumber}`
              : `Escalate Ticket #${selectedTicket.ticketNumber}`
          }
        >
          <div className="space-y-4 text-xs">
            {/* Context Info */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-900">{selectedTicket.title}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Department: <strong>{selectedTicket.department}</strong> • Current Priority: <strong>{selectedTicket.priority}</strong>
              </div>
            </div>

            {/* Modal Body Controls */}
            {(actionModalType === 'assign' || actionModalType === 'reassign') && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Assignee *</label>
                <select
                  value={modalAssignee}
                  onChange={(e) => setModalAssignee(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-800 focus:outline-none focus:border-[#0284C7]"
                >
                  <option value="Sudheshna Bharadwaj">Sudheshna Bharadwaj (Admin)</option>
                  <option value="Kotesh Goud">Kotesh Goud (IT Lead)</option>
                  <option value="Lahari Pedada">Lahari Pedada (IT Lead)</option>
                  <option value="aditya">aditya (Employee)</option>
                  <option value="Hyma">Hyma (Employee)</option>
                </select>
              </div>
            )}

            {actionModalType === 'status' && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Status *</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as TicketStatus)}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-800 focus:outline-none focus:border-[#0284C7]"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                  <option value="Escalated">Escalated</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            )}

            {actionModalType === 'priority' && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Priority *</label>
                <select
                  value={modalPriority}
                  onChange={(e) => setModalPriority(e.target.value as TicketPriority)}
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-800 focus:outline-none focus:border-[#0284C7]"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            )}

            {actionModalType === 'escalate' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" /> Escalation Warning
                </div>
                <p className="text-[11px] mt-1">
                  Escalating this ticket will set status to <strong>Escalated</strong> and priority to <strong>Urgent</strong>, flagging it for immediate management review.
                </p>
              </div>
            )}

            {/* Note input */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Action Note / Log Reason (Optional)</label>
              <textarea
                rows={2}
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                placeholder="Specify reason for this queue update..."
                className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-800 focus:outline-none focus:border-[#0284C7]"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setActionModalType(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveActionModal}>
                Apply Update
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* TICKET DETAIL DRAWER / VIEW */}
      {isDetailDrawerOpen && selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col border-l border-slate-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-[#0284C7]">{selectedTicket.ticketNumber}</span>
                  <Badge variant={selectedTicket.priority === 'Urgent' ? 'danger' : 'warning'} dot>
                    {selectedTicket.priority}
                  </Badge>
                  <Badge variant={selectedTicket.status === 'Escalated' ? 'danger' : 'info'}>
                    {selectedTicket.status}
                  </Badge>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedTicket.title}</h2>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <button
                    onClick={() => handleOpenActionModal(selectedTicket, 'reassign')}
                    className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded border border-slate-300 font-medium cursor-pointer text-[11px]"
                  >
                    Assign / Reassign
                  </button>
                  <button
                    onClick={() => handleOpenActionModal(selectedTicket, 'status')}
                    className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded border border-slate-300 font-medium cursor-pointer text-[11px]"
                  >
                    Status
                  </button>
                  <button
                    onClick={() => handleOpenActionModal(selectedTicket, 'priority')}
                    className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded border border-slate-300 font-medium cursor-pointer text-[11px]"
                  >
                    Priority
                  </button>
                  {selectedTicket.status !== 'Escalated' && (
                    <button
                      onClick={() => handleOpenActionModal(selectedTicket, 'escalate')}
                      className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded border border-red-200 font-semibold cursor-pointer text-[11px]"
                    >
                      Escalate
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsDetailDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Summary Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-medium block">Department</span>
                  <span className="font-bold text-slate-800">{selectedTicket.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Category</span>
                  <span className="font-bold text-slate-800">{selectedTicket.category || 'General IT'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Sub-category</span>
                  <span className="font-bold text-slate-800">System Permissions</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Created By</span>
                  <span className="font-bold text-slate-800">{selectedTicket.requesterName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Assigned Team</span>
                  <span className="font-bold text-slate-800">{selectedTicket.department} Team</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Assigned To</span>
                  <span className="font-bold text-[#0284C7]">{selectedTicket.assignedTo || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Created Date</span>
                  <span className="font-semibold text-slate-700">{selectedTicket.createdAt}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Updated Date</span>
                  <span className="font-semibold text-slate-700">{selectedTicket.createdAt}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">SLA Status</span>
                  <span className="font-bold text-amber-600">{selectedTicket.slaStatus}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2">Description</h3>
                <div className="p-4 bg-white border border-slate-200 rounded-xl text-slate-800 leading-relaxed text-xs">
                  {selectedTicket.description || 'No additional description provided for this ticket.'}
                </div>
              </div>

              {/* Attachments */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-slate-500" /> Attachments (2)
                </h3>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors cursor-pointer">
                    <span className="font-mono text-[11px] text-[#0284C7] font-bold">system_error_log.txt</span>
                    <span className="text-slate-400 text-[10px]">14 KB</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors cursor-pointer">
                    <span className="font-mono text-[11px] text-[#0284C7] font-bold">screenshot_alert.png</span>
                    <span className="text-slate-400 text-[10px]">240 KB</span>
                  </div>
                </div>
              </div>

              {/* Comments & Activity History */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-3">Activity & Comments</h3>

                <div className="space-y-3 mb-4">
                  {(selectedTicket.history || [
                    { id: '1', author: 'System Sentinel', text: 'Ticket submitted and queued for triage.', timestamp: '2 hours ago' },
                    { id: '2', author: 'Kotesh Goud', text: 'Triaged and assigned priority.', timestamp: '1 hour ago' }
                  ]).map((item) => (
                    <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{item.author}</span>
                        <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                      </div>
                      <p className="text-slate-700">{item.text}</p>
                    </div>
                  ))}
                </div>

                {/* Add Comment Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add an internal note or comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0284C7]"
                  />
                  <Button variant="primary" size="sm" onClick={handleAddComment} icon={<Send className="w-3.5 h-3.5" />}>
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
