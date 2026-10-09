import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Users,
  Paperclip,
  Send,
  CheckCircle2,
  FileText,
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { EmployeeService } from '../services/employeeService';
import type { EmployeeTicket, TicketStatus } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { AttachmentFilePicker, type AttachedFile } from '../components/ui/AttachmentFilePicker';

export const AssignedTicketDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<EmployeeTicket | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentAttachedFiles, setCommentAttachedFiles] = useState<AttachedFile[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>('In Progress');
  const [statusNote, setStatusNote] = useState('');

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('Unable to Resolve');
  const [escalateComment, setEscalateComment] = useState('');

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionText, setResolutionText] = useState('');

  const [showAttachModal, setShowAttachModal] = useState(false);
  const [modalAttachedFiles, setModalAttachedFiles] = useState<AttachedFile[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadTicket = () => {
    if (!id) return;
    const found = EmployeeService.getTicketById(id);
    if (found) {
      setTicket({ ...found });
      setSelectedStatus(found.status);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [id]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  if (!ticket) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto mt-12 shadow-2xs font-sans">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Ticket Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          The requested ticket does not exist or may have been deleted.
        </p>
        <Button
          variant="primary"
          onClick={() => navigate('/dashboard')}
          className="bg-[#0284C7] hover:bg-[#0369a1] text-white"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isAssignedToMe = !!ticket.assignedBy || ticket.assignedTo === 'Manikanta (You)';

  const handleStatusUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const updated = await EmployeeService.updateTicketStatus(id, selectedStatus, statusNote);
    if (updated) {
      setTicket({ ...updated });
      setShowStatusModal(false);
      setStatusNote('');
      setToastMessage(`Ticket status updated to ${selectedStatus}.`);
    }
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !escalateComment.trim()) return;
    const updated = await EmployeeService.escalateTicket(id, escalateReason, escalateComment.trim());
    if (updated) {
      setTicket({ ...updated });
      setSelectedStatus('Escalated');
      setShowEscalateModal(false);
      setEscalateComment('');
      setToastMessage('Ticket escalated successfully.');
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const resText = resolutionText.trim() || 'Issue resolved by assigned technician.';
    const updated = await EmployeeService.resolveTicket(id, resText);
    if (updated) {
      setTicket({ ...updated });
      setSelectedStatus('Resolved');
      setShowResolveModal(false);
      setResolutionText('');
      setToastMessage('Ticket marked as resolved successfully.');
    }
  };

  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;
    const attachmentStr = commentAttachedFiles.map((f) => `${f.name} (${f.size})`).join(', ');
    const updated = await EmployeeService.addComment(id, newComment, attachmentStr || undefined);
    if (updated) {
      setTicket({ ...updated });
      setNewComment('');
      setCommentAttachedFiles([]);
      setToastMessage('Comment posted to activity log.');
    }
  };

  const handleAddAttachmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || modalAttachedFiles.length === 0) return;
    let updatedTicket: EmployeeTicket | null = ticket;
    for (const f of modalAttachedFiles) {
      const fileNameStr = `${f.name} (${f.size})`;
      updatedTicket = await EmployeeService.addAttachment(id, fileNameStr);
    }
    if (updatedTicket) {
      setTicket({ ...updatedTicket });
      setModalAttachedFiles([]);
      setShowAttachModal(false);
      setToastMessage(`${modalAttachedFiles.length} file(s) attached successfully.`);
    }
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
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

      {/* Back Button & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0284C7] transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Tickets
        </button>

        {isAssignedToMe && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedStatus(ticket.status);
                setShowStatusModal(true);
              }}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
            >
              Update Status
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEscalateModal(true)}
              className="border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-100/60 font-semibold text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Escalate
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAttachModal(true)}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
            >
              <Paperclip className="w-3.5 h-3.5 mr-1" />
              Add Attachment
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowResolveModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Mark as Resolved
            </Button>
          </div>
        )}
      </div>


      {/* Ticket Header & Metadata */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-xs font-bold text-[#0284C7] bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                {ticket.ticketNumber}
              </span>
              <Badge priority={ticket.priority} />
              <Badge status={ticket.status} />
              {isAssignedToMe && (
                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                  Assigned Ticket
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 leading-snug">{ticket.title}</h1>
          </div>

          {ticket.sla && (() => {
            const slaLower = ticket.sla.toLowerCase();
            const isBreached = slaLower.includes('breached') || slaLower.includes('overdue');
            const isRisk = slaLower.includes('risk') || /([1-3]h|\d+m remaining)/i.test(ticket.sla);
            const isResolved = ticket.status === 'Resolved' || ticket.status === 'Closed';

            if (isResolved) {
              return (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-emerald-800 text-xs font-medium shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">SLA Status</div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black">COMPLETED</span>
                      <span>{ticket.sla}</span>
                    </div>
                  </div>
                </div>
              );
            }

            if (isBreached) {
              return (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-xl text-red-800 text-xs font-medium shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-600 animate-pulse" />
                  <div>
                    <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">SLA Status</div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black">SLA BREACHED</span>
                      <span>{ticket.sla}</span>
                    </div>
                  </div>
                </div>
              );
            }

            if (isRisk) {
              return (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-amber-900 text-xs font-medium shrink-0">
                  <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                  <div>
                    <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">SLA Status</div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black">SLA RISK</span>
                      <span>{ticket.sla}</span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-3 py-2 rounded-xl text-[#0284C7] text-xs font-medium shrink-0">
                <Clock className="w-4 h-4 text-[#0284C7]" />
                <div>
                  <div className="text-[10px] font-bold text-[#0284C7] uppercase tracking-wider">SLA Status</div>
                  <div className="font-bold text-slate-800">{ticket.sla}</div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Assigned Team Leads & Multi-Department Routing Card */}
        <div className="p-6 bg-sky-50/50 border-b border-sky-100">
          <h3 className="text-xs font-bold text-[#0284C7] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Assigned Department Team Leads ({ticket.teamLeads?.length || 1})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ticket.teamLeads && ticket.teamLeads.length > 0 ? (
              ticket.teamLeads.map((tl) => (
                <div key={tl.id} className="bg-white border border-sky-200/90 rounded-xl p-3.5 flex items-center gap-3 shadow-2xs">
                  <div className="w-9 h-9 rounded-full bg-[#0284C7] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {tl.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{tl.name}</div>
                    <div className="text-[11px] font-medium text-slate-500">{tl.role}</div>
                    <div className="text-[10px] font-mono text-[#0284C7] mt-0.5">{tl.email}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
                <span className="font-bold">{ticket.assignedBy || 'Team Lead'}</span> — {ticket.department}
              </div>
            )}
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 bg-white border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Category
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.category}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Sub-category
            </span>
            <span className="text-xs font-semibold text-slate-800">
              {ticket.subCategory || 'General'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Department(s)
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.department}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Created Date
            </span>
            <span className="text-xs font-semibold text-slate-800">
              {ticket.createdAt}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Last Updated
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.updatedAt}</span>
          </div>
        </div>

        {/* Description */}
        <div className="p-6 bg-white border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Description
          </h3>
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>

        {/* Resolution Notes (If Resolved) */}
        {ticket.resolutionNotes && (
          <div className="p-6 bg-emerald-50/60 border-b border-emerald-100">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Resolution Summary
            </h3>
            <div className="bg-white border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 leading-relaxed font-medium">
              {ticket.resolutionNotes}
            </div>
          </div>
        )}

        {/* Attachments Section */}
        <div className="p-6 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              Attachments ({ticket.attachments?.length || 0})
            </h3>
            <button
              type="button"
              onClick={() => setShowAttachModal(true)}
              className="text-xs font-semibold text-[#0284C7] hover:underline cursor-pointer flex items-center gap-1"
            >
              + Upload File
            </button>
          </div>

          {ticket.attachments && ticket.attachments.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {ticket.attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 font-medium hover:border-[#0284C7] transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#0284C7]" />
                  <span>{file}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No files attached to this ticket.</p>
          )}
        </div>
      </div>

      {/* Activity & Comments Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <Activity className="w-4 h-4 text-[#0284C7]" />
          <h2 className="text-sm font-bold text-slate-900">Comments & Activity Log</h2>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-4">
          {ticket.history && ticket.history.length > 0 ? (
            ticket.history.map((item) => (
              <div key={item.id} className="flex items-start gap-3 text-xs">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                  {item.author.charAt(0)}
                </div>
                <div className="flex-1 bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800">{item.author}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{item.timestamp}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{item.text}</p>
                  {item.attachment && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-[#0284C7]">
                      <Paperclip className="w-3 h-3" />
                      {item.attachment}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-4">No activity logged yet.</p>
          )}
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleAddCommentSubmit} className="pt-4 border-t border-slate-100 space-y-3">
          <label className="block text-xs font-bold text-slate-700">Add a Comment / Progress Update</label>
          <textarea
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Type your comment or update here..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20"
          />
          <AttachmentFilePicker
            files={commentAttachedFiles}
            onFilesChange={setCommentAttachedFiles}
            label=""
            buttonText="Attach Local File to Comment"
            compact
          />
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!newComment.trim()}
              className="bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold shadow-2xs"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Post Comment
            </Button>
          </div>
        </form>
      </div>

      {/* Modals for Worker Actions */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 font-sans">
            <h3 className="text-base font-bold text-slate-900 mb-4">Update Ticket Status</h3>
            <form onSubmit={handleStatusUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Status</label>
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
                  options={[
                    { value: 'Open', label: 'Open' },
                    { value: 'In Progress', label: 'In Progress' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Escalated', label: 'Escalated' },
                    { value: 'Resolved', label: 'Resolved' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Note / Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Explain why status was updated..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowStatusModal(false)}
                  className="border-slate-200 text-slate-600"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="bg-[#0284C7] text-white">
                  Save Status
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 font-sans space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Escalate Ticket
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Escalate this ticket to <strong className="text-slate-700">{ticket.assignedBy || 'Team Lead'}</strong> for priority assistance.
              </p>
            </div>

            <form onSubmit={handleEscalateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <Select
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  options={[
                    { value: 'Unable to Resolve', label: 'Unable to Resolve' },
                    { value: 'Requires Team Lead Support', label: 'Requires Team Lead Support' },
                    { value: 'Technical Issue', label: 'Technical Issue' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Comment / Explanation <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={escalateComment}
                  onChange={(e) => setEscalateComment(e.target.value)}
                  placeholder="Provide detailed explanation for escalation..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEscalateModal(false)}
                  className="border-slate-200 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!escalateComment.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  Escalate Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark as Resolved Confirmation Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 font-sans space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Mark as Resolved</h3>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Are you sure you want to mark this ticket as resolved?
                </p>
              </div>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Resolution Summary / Explanation (Optional)
                </label>
                <textarea
                  rows={3}
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Describe resolution steps or completed changes..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResolveModal(false)}
                  className="border-slate-200 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Mark as Resolved
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}


      {showAttachModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 font-sans">
            <h3 className="text-base font-bold text-slate-900 mb-1">Attach File</h3>
            <p className="text-xs text-slate-500 mb-4">Select files from your computer to attach to this ticket.</p>
            <form onSubmit={handleAddAttachmentSubmit} className="space-y-4">
              <AttachmentFilePicker
                files={modalAttachedFiles}
                onFilesChange={setModalAttachedFiles}
                label="Select Files from Computer"
                buttonText="Browse Files from PC"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAttachModal(false);
                    setModalAttachedFiles([]);
                  }}
                  className="border-slate-200 text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={modalAttachedFiles.length === 0}
                  className="bg-[#0284C7] text-white font-semibold"
                >
                  Upload Attachments
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
