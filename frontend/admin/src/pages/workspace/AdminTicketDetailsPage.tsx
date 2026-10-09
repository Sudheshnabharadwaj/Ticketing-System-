import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  Users,
  Paperclip,
  Send,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { AdminApiService } from '../../services/api';
import type { Ticket, TicketStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { AttachmentFilePicker, type AttachedFile } from '../../components/ui/AttachmentFilePicker';

const TEAM_LEAD_MAP: Record<string, string> = {
  'IT Support': 'Kotesh Goud (IT Support Team Lead)',
  'Finance': 'David Miller (Finance Team Lead)',
  'HR': 'Adi (HR Operations Team Lead)',
  'HR Operations': 'Adi (HR Operations Team Lead)',
  'Facilities': 'Mounika (Facilities Team Lead)',
  'General Administration': 'Sudha (General Administration Team Lead)',
  'Operations': 'Mounika (Facilities & Ops Team Lead)',
};

function resolveTeamLeadForDepartment(dept: string): string {
  const norm = dept.trim();
  if (TEAM_LEAD_MAP[norm]) return TEAM_LEAD_MAP[norm];
  if (norm.toLowerCase().includes('it')) return 'Kotesh Goud (IT Support Team Lead)';
  if (norm.toLowerCase().includes('finance')) return 'David Miller (Finance Team Lead)';
  if (norm.toLowerCase().includes('hr')) return 'Adi (HR Operations Team Lead)';
  if (norm.toLowerCase().includes('facil')) return 'Mounika (Facilities Team Lead)';
  if (norm.toLowerCase().includes('admin')) return 'Sudha (General Administration Team Lead)';
  return `${norm} Team Lead`;
}

export const AdminTicketDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const fromSource = searchParams.get('from');

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentAttachedFiles, setCommentAttachedFiles] = useState<AttachedFile[]>([]);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>('In Progress');
  const [statusNote, setStatusNote] = useState('');

  const [showAttachModal, setShowAttachModal] = useState(false);
  const [modalAttachedFiles, setModalAttachedFiles] = useState<AttachedFile[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadTicket = async () => {
    if (!id) return;
    setIsLoading(true);
    const found = await AdminApiService.getTicketById(id);
    if (found) {
      setTicket({ ...found });
      setSelectedStatus(found.status);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadTicket();
  }, [id]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleBack = () => {
    if (fromSource === 'my-tickets') {
      navigate('/admin/workspace/my-tickets');
    } else {
      navigate('/admin/workspace/all');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto mt-12 shadow-2xs font-sans">
        <Clock className="w-8 h-8 text-[#0284C7] animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-600">Loading ticket details...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto mt-12 shadow-2xs font-sans">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Ticket Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          The requested ticket does not exist or may have been removed.
        </p>
        <Button variant="primary" onClick={handleBack} className="bg-[#0284C7] text-white">
          Back to Tickets
        </Button>
      </div>
    );
  }

  const assignedTeamLeadStr = ticket.assignedTeamLead || resolveTeamLeadForDepartment(ticket.department);

  const handleStatusUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const note = statusNote.trim() || `Status changed to ${selectedStatus}`;
    const updated = await AdminApiService.updateTicket(id, { status: selectedStatus }, note);
    if (updated) {
      setTicket({ ...updated });
      setShowStatusModal(false);
      setStatusNote('');
      setToastMessage(`Ticket status updated to ${selectedStatus}.`);
    }
  };

  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;
    const attachmentStr = commentAttachedFiles.map((f) => `${f.name} (${f.size})`).join(', ');
    const updated = await AdminApiService.addComment(id, newComment.trim(), attachmentStr || undefined);
    if (updated) {
      setTicket({ ...updated });
      setNewComment('');
      setCommentAttachedFiles([]);
      setToastMessage('Comment posted successfully.');
    }
  };

  const handleAddAttachmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || modalAttachedFiles.length === 0) return;
    let updatedTicket: Ticket | null = ticket;
    for (const f of modalAttachedFiles) {
      const fileNameStr = `${f.name} (${f.size})`;
      updatedTicket = await AdminApiService.addAttachment(id, fileNameStr);
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
      {/* Toast Banner */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs">
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

      {/* Top Bar: Back Button & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0284C7] transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to {fromSource === 'my-tickets' ? 'My Tickets' : 'All Tickets'}
        </button>

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
            onClick={() => setShowAttachModal(true)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
          >
            <Paperclip className="w-3.5 h-3.5 mr-1" />
            Add Attachment
          </Button>
        </div>
      </div>

      {/* Main Ticket Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Ticket Header & Title */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-xs font-bold text-[#0284C7] bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                {ticket.ticketNumber}
              </span>
              <Badge
                variant={ticket.priority === 'Urgent' ? 'danger' : ticket.priority === 'High' ? 'warning' : 'neutral'}
                dot
                className="text-xs"
              >
                {ticket.priority}
              </Badge>
              <Badge
                variant={ticket.status === 'Escalated' ? 'danger' : ticket.status === 'In Progress' ? 'info' : ticket.status === 'Resolved' ? 'success' : 'neutral'}
                className="text-xs"
              >
                {ticket.status}
              </Badge>
            </div>
            <h1 className="text-xl font-bold text-slate-900 leading-snug">{ticket.title}</h1>
          </div>

          {/* SLA Badge */}
          <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-3 py-2 rounded-xl text-[#0284C7] text-xs font-medium shrink-0">
            <Clock className="w-4 h-4 text-[#0284C7]" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SLA Deadline</div>
              <div className="font-bold text-slate-800">{ticket.dueDate || ticket.createdAt}</div>
              <div className="text-[10px] font-semibold text-[#0284C7] mt-0.5">{ticket.slaStatus}</div>
            </div>
          </div>
        </div>

        {/* 15 Metadata Fields Display Grid */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 bg-white border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Ticket ID
            </span>
            <span className="text-xs font-mono font-bold text-[#0284C7]">{ticket.ticketNumber}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Status
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.status}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Priority
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.priority}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Department
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.department}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Category
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.category}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Created By / Requester
            </span>
            <div className="text-xs font-semibold text-slate-800">{ticket.requesterName}</div>
            <div className="text-[10px] font-mono text-slate-400">{ticket.requesterEmail}</div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Assigned Employee
            </span>
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#0284C7]" />
              {ticket.assignedTo || 'Unassigned'}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Assigned Team Lead
            </span>
            <div className="text-xs font-semibold text-[#0284C7] flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#0284C7]" />
              {assignedTeamLeadStr}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Created Date
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.createdAt}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Last Updated Date
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.updatedAt || ticket.createdAt}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              SLA Status
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.slaStatus}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              SLA Deadline
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.dueDate}</span>
          </div>
        </div>

        {/* Description Section */}
        <div className="p-6 bg-white border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Description
          </h3>
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>

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
            <p className="text-xs text-slate-400 italic">No attachments uploaded yet.</p>
          )}
        </div>
      </div>

      {/* Activity & Comments Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <Activity className="w-4 h-4 text-[#0284C7]" />
          <h2 className="text-sm font-bold text-slate-900">Comments & Activity Log</h2>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {ticket.history && ticket.history.length > 0 ? (
            ticket.history.map((item) => (
              <div key={item.id} className="flex items-start gap-3 text-xs">
                <div className="w-8 h-8 rounded-full bg-sky-50 border border-sky-100 text-[#0284C7] flex items-center justify-center font-bold shrink-0 mt-0.5">
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
            <p className="text-xs text-slate-400 italic text-center py-4">No comments or activity logged yet.</p>
          )}
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleAddCommentSubmit} className="pt-4 border-t border-slate-100 space-y-3">
          <label className="block text-xs font-bold text-slate-700">Add Comment / Activity Note</label>
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

      {/* Update Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 font-sans space-y-4">
            <h3 className="text-base font-bold text-slate-900">Update Ticket Status</h3>
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
                    { value: 'Closed', label: 'Closed' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Note / Activity Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Explain why status was updated..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-[#0284C7]"
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

      {/* Add Attachment Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 font-sans space-y-4">
            <h3 className="text-base font-bold text-slate-900">Upload Attachment</h3>
            <form onSubmit={handleAddAttachmentSubmit} className="space-y-4">
              <AttachmentFilePicker
                files={modalAttachedFiles}
                onFilesChange={setModalAttachedFiles}
                label="Select Local Computer Files"
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
