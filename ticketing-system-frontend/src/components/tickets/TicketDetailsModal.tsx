import React, { useState } from 'react';
import { Ticket, TicketPriority, TicketStatus } from '../../types/ticket';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { formatDate, getSLABadgeStyle } from '../../utils/helpers';
import {
  X,
  Clock,
  User,
  Send,
  Lock,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  History,
  MessageSquare,
  FileText
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTickets } from '../../hooks/useTickets';
import { PRIORITIES, STATUSES } from '../../utils/constants';

interface TicketDetailsModalProps {
  ticket: Ticket | null;
  onClose: () => void;
}

export const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({ ticket, onClose }) => {
  if (!ticket) return null;

  const { role, user, users } = useAuth();
  const {
    updateStatus,
    assignAgent,
    changePriority,
    addComment,
    escalateTicket,
    resolveTicket,
  } = useTickets();

  const [activeTab, setActiveTab] = useState<'conversation' | 'history' | 'attachments'>('conversation');
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [escalationModalOpen, setEscalationModalOpen] = useState(false);
  const [escalationReasonInput, setEscalationReasonInput] = useState('');

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    addComment(
      ticket.id,
      user.name,
      role,
      newComment.trim(),
      isInternalNote
    );

    setNewComment('');
  };

  const handleConfirmEscalation = () => {
    if (!escalationReasonInput.trim()) return;
    escalateTicket(ticket.id, escalationReasonInput.trim(), user.name);
    setEscalationModalOpen(false);
    setEscalationReasonInput('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="font-mono font-bold text-sky-600 bg-sky-100 px-2.5 py-0.5 rounded-md text-xs">
                {ticket.id}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{ticket.subject}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Main Conversation & Activity Panel */}
          <div className="lg:col-span-2 p-5 flex flex-col">
            {/* Tabs */}
            <div className="flex space-x-1 border-b border-slate-200 mb-4 pb-2">
              <button
                onClick={() => setActiveTab('conversation')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'conversation'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Conversation & Notes ({ticket.comments?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'history'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <History className="w-4 h-4" />
                Audit History ({ticket.activities?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('attachments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  activeTab === 'attachments'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Paperclip className="w-4 h-4" />
                Attachments ({ticket.attachments?.length || 0})
              </button>
            </div>

            {/* Description Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 text-xs text-slate-700 leading-relaxed">
              <p className="font-semibold text-slate-900 mb-1">Issue Description:</p>
              <p className="whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {/* Tab 1: Conversation */}
            {activeTab === 'conversation' && (
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2 mb-4">
                  {ticket.comments?.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-6">
                      No replies yet. Be the first to comment!
                    </p>
                  ) : (
                    ticket.comments?.map((comment) => (
                      <div
                        key={comment.id}
                        className={`p-3.5 rounded-xl border text-xs ${
                          comment.isInternal
                            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                            : comment.authorRole === 'employee'
                            ? 'bg-sky-50/50 border-sky-200 text-slate-800'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900">{comment.authorName}</span>
                            <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-md bg-slate-200 text-slate-700">
                              {comment.authorRole}
                            </span>
                            {comment.isInternal && (
                              <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded-md">
                                <Lock className="w-3 h-3 mr-1" /> Internal Note
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-slate-700">{comment.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Form */}
                <form onSubmit={handlePostComment} className="pt-2 border-t border-slate-200">
                  {role === 'teamlead' && (
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded-xs text-sky-600 focus:ring-sky-500"
                        />
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        Add as Internal Team Note (Hidden from employee)
                      </label>
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={
                        isInternalNote
                          ? 'Write an internal note for support team...'
                          : 'Type your message or response...'
                      }
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white resize-none"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="absolute right-3 bottom-3 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Post
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 2: Audit History */}
            {activeTab === 'history' && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {ticket.activities?.map((act) => (
                  <div key={act.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">{act.user}</span>
                      <span className="text-slate-600 ml-2">{act.action}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{formatDate(act.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Attachments */}
            {activeTab === 'attachments' && (
              <div className="space-y-2">
                {ticket.attachments?.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">No attachments uploaded.</p>
                ) : (
                  ticket.attachments?.map((att, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-sky-600" />
                        <div>
                          <p className="font-semibold text-slate-800">{att.name}</p>
                          <p className="text-[10px] text-slate-400">{att.size}</p>
                        </div>
                      </div>
                      <button className="px-2.5 py-1 text-[11px] font-medium text-sky-600 hover:bg-sky-100 rounded-lg transition-colors">
                        Download
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right Metadata & Action Sidebar */}
          <div className="p-5 bg-slate-50/50 space-y-5 text-xs">
            {/* SLA Status Card */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                SLA Compliance
              </p>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${getSLABadgeStyle(ticket.slaStatus)}`}>
                  <Clock className="w-3 h-3 mr-1" />
                  {ticket.slaStatus}
                </span>
                <span className="text-xs font-medium text-slate-600">{ticket.slaRemaining}</span>
              </div>
            </div>

            {/* Ticket Details Info */}
            <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-900 border-b border-slate-100 pb-1 text-xs">
                Ticket Details
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
                  <span className="font-semibold text-slate-800">{ticket.department || 'IT'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Category</span>
                  <span className="font-semibold text-slate-800">{ticket.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned To</span>
                  <span className="font-semibold text-sky-700">{ticket.assignedAgent}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned By</span>
                  <span className="font-medium text-slate-700">{ticket.assignedBy || (ticket.employee ? `${ticket.employee} (Requester)` : 'Unassigned')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned Date</span>
                  <span className="text-slate-700 text-[11px]">{formatDate(ticket.assignedDate || ticket.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Last Updated</span>
                  <span className="text-slate-700 text-[11px]">{formatDate(ticket.updatedAt)}</span>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employee / Requester</span>
                <span className="font-semibold text-slate-800">{ticket.employee}</span>
                <span className="text-slate-400 block text-[10px]">{ticket.employeeEmail}</span>
              </div>

              {ticket.status === 'Resolved' && (
                <div className="pt-2 border-t border-emerald-100 bg-emerald-50/60 p-2.5 rounded-lg text-emerald-900">
                  <span className="text-emerald-700 block text-[10px] uppercase font-bold">Resolution Summary</span>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {ticket.resolutionSummary || 'Issue resolved following standard troubleshooting & verification.'}
                  </p>
                </div>
              )}
            </div>

            {/* Team Lead Controls */}
            {role === 'teamlead' && (
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-sky-600" />
                  Team Lead Control Center
                </p>

                {/* Assign Employee */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Assign / Reassign Employee</label>
                  <select
                    value={ticket.assignedAgent}
                    onChange={(e) => {
                      const selectedUser = users.find((u) => u.name === e.target.value);
                      assignAgent(ticket.id, selectedUser ? selectedUser.id : 'EMP-001', e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} - {u.id} ({u.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Change Status */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Update Status</label>
                  <select
                    value={ticket.status}
                    onChange={(e) => updateStatus(ticket.id, e.target.value as TicketStatus)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Change Priority */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Change Priority</label>
                  <select
                    value={ticket.priority}
                    onChange={(e) => changePriority(ticket.id, e.target.value as TicketPriority)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Escalate & Resolve Buttons */}
                <div className="pt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEscalationModalOpen(true)}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg border border-rose-200 text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Escalate
                  </button>
                  <button
                    onClick={() => resolveTicket(ticket.id)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1 transition-colors shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Escalation Confirmation Dialog */}
      {escalationModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2 text-rose-600 font-bold text-lg mb-2">
              <AlertTriangle className="w-6 h-6" />
              <span>Escalate Ticket {ticket.id}</span>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Escalating will transfer ownership to Tier 3 Incident Management. Please state the justification.
            </p>
            <textarea
              rows={3}
              value={escalationReasonInput}
              onChange={(e) => setEscalationReasonInput(e.target.value)}
              placeholder="State escalation reason (e.g., SLA breach risk, hardware replacement required)..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl mb-4 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEscalationModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEscalation}
                disabled={!escalationReasonInput.trim()}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
