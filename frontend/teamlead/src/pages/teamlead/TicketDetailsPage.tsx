import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useTickets } from '../../hooks/useTickets';
import { useAuth } from '../../hooks/useAuth';
import { ticketService, type AttachmentRecord } from '../../services/ticketService';
import { authenticatedFetch, ensureBackendSession, withAccessToken } from '../../services/backendAuth';
import { API_BASE_URL } from '../../utils/constants';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { UserAvatar } from '../../components/common/UserAvatar';
import { AttachmentPicker, FileAttachmentItem } from '../../components/common/AttachmentPicker';
import { formatDate } from '../../utils/helpers';
import { OrganizationService } from '../../services/organizationService';
import { Ticket, TicketStatus, TicketPriority, TicketComment, TicketActivity } from '../../types/ticket';
import {
  ArrowLeft,
  Clock,
  UserCheck,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Send,
  Lock,
  MessageSquare,
  History,
  FileText,
  Upload,
  RefreshCw,
  ChevronDown,
  Download,
  Eye,
  X
} from 'lucide-react';

export const TicketDetailsPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isReadOnly = searchParams.get('mode') === 'view';

  const switchToWorkMode = () => {
    const nextParams = new URLSearchParams(location.search);
    nextParams.set('mode', 'work');
    navigate(`${location.pathname}?${nextParams.toString()}`, { replace: true });
  };

  const switchToViewMode = () => {
    const nextParams = new URLSearchParams(location.search);
    nextParams.set('mode', 'view');
    navigate(`${location.pathname}?${nextParams.toString()}`, { replace: true });
  };

  const { tickets, updateStatus, changePriority, addComment, escalateTicket, resolveTicket } = useTickets();
  const { user, role } = useAuth();

  const [ticketData, setTicketData] = useState<Ticket | null>(() => tickets.find((t) => t.id === ticketId) || null);
  const [ticketLoading, setTicketLoading] = useState(() => !tickets.find((t) => t.id === ticketId));

  // Modal States
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  // Form Inputs
  const [selectedTeamLead, setSelectedTeamLead] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [escalationComment, setEscalationComment] = useState('');
  const [escalateTo, setEscalateTo] = useState('Tier 3 Operations');
  const [escalatePriority, setEscalatePriority] = useState<TicketPriority>('High');
  const [resolutionSummaryInput, setResolutionSummaryInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<FileAttachmentItem[]>([]);
  const [activeTab, setActiveTab] = useState<'conversation' | 'history' | 'attachments'>('conversation');
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; size?: string; viewUrl?: string; downloadUrl?: string } | null>(null);
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTicket = async () => {
      if (!ticketId) {
        setTicketLoading(false);
        return;
      }
      try {
        const fetched = await ticketService.getTicketById(ticketId);
        if (isMounted && fetched) {
          setTicketData(fetched);
          if (fetched.attachments && fetched.attachments.length > 0) {
            setAttachments(fetched.attachments as AttachmentRecord[]);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch ticket by id:', err);
      } finally {
        if (isMounted) setTicketLoading(false);
      }
    };
    fetchTicket();
    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  const ticket = ticketData || tickets.find((t) => t.id === ticketId);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadAttachments = async () => {
    const tid = ticketId || ticket?.id;
    if (!tid) return;
    setAttachmentsLoading(true);
    setAttachmentsError(null);
    const result = await ticketService.getAttachmentsDetailed(tid);
    setAttachments(result.attachments);
    setAttachmentsError(result.error);
    setAttachmentsLoading(false);
  };

  useEffect(() => {
    if (ticketId || ticket?.id) {
      loadAttachments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, ticket?.id]);

  const handleDownloadAttachment = async (attName: string, attUrl?: string) => {
    const cleanName = attName.includes(' (') ? attName.split(' (')[0] : attName;
    const tid = ticket?.id || ticketId;
    const url = attUrl || `${API_BASE_URL}/tickets/${tid}/attachments/${encodeURIComponent(cleanName)}/download`;
    try {
      await ensureBackendSession();
      const res = await authenticatedFetch(url);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = cleanName.includes('.') ? cleanName : `${cleanName}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      showToast(`Downloading attachment: ${cleanName}`);
    } catch {
      showToast(`Failed to download ${cleanName}. The file may not exist on the server.`);
    }
  };

  const handleViewAttachment = async (att: AttachmentRecord) => {
    const cleanName = att.name.includes(' (') ? att.name.split(' (')[0] : att.name;
    const tid = ticket?.id || ticketId;
    await ensureBackendSession();
    const baseViewUrl =
      att.viewUrl ||
      (att.url
        ? att.url.replace('/download', '/view')
        : `${API_BASE_URL}/tickets/${tid}/attachments/${encodeURIComponent(cleanName)}/view`);
    const viewUrl = withAccessToken(baseViewUrl);
    setPreviewAttachment({ name: att.name, size: att.size, viewUrl, downloadUrl: att.url });
  };

  if (ticketLoading && !ticket) {
    return (
      <div className="space-y-6">
        <Link
          to="/teamlead/assigned-tickets"
          className="inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Tickets
        </Link>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs">
          <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">Loading Ticket Details...</h2>
          <p className="text-xs text-slate-500 mt-1">Retrieving ticket {ticketId} and its attachments.</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-6">
        <Link
          to="/teamlead/assigned-tickets"
          className="inline-flex items-center text-xs font-semibold text-sky-600 hover:text-sky-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Tickets
        </Link>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Ticket Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            The requested ticket "{ticketId}" could not be located in the portal database.
          </p>
          <button
            onClick={() => navigate('/teamlead/assigned-tickets')}
            className="px-4 py-2 bg-sky-600 text-white font-semibold text-xs rounded-xl hover:bg-sky-700 transition-colors cursor-pointer"
          >
            Return to Assigned Tickets
          </button>
        </div>
      </div>
    );
  }

  // Handle Action Submissions
  const handleUpdateStatus = (newStatus: TicketStatus) => {
    updateStatus(ticket.id, newStatus);
    setIsUpdateStatusOpen(false);
    showToast(`Status updated to ${newStatus}`);
  };

  const handleConfirmEscalation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalationReason.trim() || !escalationComment.trim()) return;
    const targetLead = selectedTeamLead || user.name || 'Team Lead';
    const fullReason = `${escalationReason}: ${escalationComment.trim()}`;
    escalateTicket(ticket.id, fullReason, targetLead);
    if (escalatePriority !== ticket.priority) {
      changePriority(ticket.id, escalatePriority);
    }
    setIsEscalateModalOpen(false);
    setEscalationReason('');
    setEscalationComment('');
    showToast(`Ticket ${ticket.id} escalated successfully to ${targetLead}`);
  };

  const handleConfirmAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    const files = pendingAttachments.map((a) => a.file).filter(Boolean) as File[];
    if (files.length === 0) return;
    const ok = await ticketService.uploadAttachments(ticket.id, files);
    setIsAttachmentModalOpen(false);
    setPendingAttachments([]);
    if (ok) {
      showToast(`${files.length} attachment(s) uploaded successfully.`);
      loadAttachments();
    } else {
      showToast('Upload failed. Please verify the file type and size (max 25 MB) and try again.');
    }
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionSummaryInput.trim()) return;
    resolveTicket(ticket.id, resolutionSummaryInput.trim());
    setIsResolveModalOpen(false);
    setResolutionSummaryInput('');
    showToast(`Ticket ${ticket.id} marked as Resolved.`);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment(ticket.id, user.name, role, newComment.trim(), isInternalNote);
    setNewComment('');
  };

  // SLA Badge style helper
  const getSlaBadge = (slaStatus: string) => {
    if (slaStatus === 'Breached') {
      return { label: 'BREACHED', style: 'bg-rose-100 text-rose-800 border-rose-200' };
    }
    if (slaStatus === 'At Risk') {
      return { label: 'AT RISK', style: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    return { label: 'COMPLIANT', style: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  };

  const slaBadge = getSlaBadge(ticket.slaStatus);

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* TOP AREA: Back Button + Action Buttons Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Back Link */}
        <Link
          to="/teamlead/assigned-tickets"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-sky-600 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Tickets</span>
        </Link>

        {/* Right: Action Buttons Row */}
        <div className="flex items-center flex-wrap gap-2">
          {isReadOnly ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              View
            </span>
          ) : (
            <>
              {/* Update Status Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsUpdateStatusOpen(!isUpdateStatusOpen)}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
                  <span>Update Status</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isUpdateStatusOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsUpdateStatusOpen(false)} />
                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 z-30 py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                      <p className="px-3 py-1.5 font-bold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        Set Ticket Status
                      </p>
                      {(['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'] as TicketStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleUpdateStatus(s)}
                          className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                            ticket.status === s ? 'font-bold text-sky-600 bg-sky-50/50' : 'text-slate-700'
                          }`}
                        >
                          <span>{s}</span>
                          {ticket.status === s && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Escalate Button */}
              {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && ticket.status !== 'Escalated' && (
                <button
                  onClick={() => setIsEscalateModalOpen(true)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Escalate</span>
                </button>
              )}

              {/* Add Attachment Button */}
              <button
                onClick={() => setIsAttachmentModalOpen(true)}
                className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                <span>Add Attachment</span>
              </button>

              {/* Mark as Resolved Button */}
              {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                <button
                  onClick={() => setIsResolveModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark as Resolved</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* MAIN TICKET CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-6">
        {/* Top Badges & Title & SLA Box Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-3 flex-1 min-w-0">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-xs px-2.5 py-1 bg-sky-100 text-sky-700 rounded-md border border-sky-200/80">
                {ticket.id}
              </span>
              <PriorityBadge priority={ticket.priority} size="sm" />
              <StatusBadge status={ticket.status} size="sm" />
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-indigo-600" />
                Assigned Ticket
              </span>
            </div>

            {/* Ticket Subject Title */}
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight leading-tight">
              {ticket.subject}
            </h1>
          </div>

          {/* Compact SLA STATUS Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shrink-0 min-w-[170px] text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              SLA STATUS
            </span>
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${slaBadge.style}`}>
                {slaBadge.label}
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-600 block mt-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {ticket.slaRemaining}
            </span>
          </div>
        </div>

        {/* TICKET INFORMATION GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              CATEGORY
            </span>
            <span className="font-semibold text-slate-900 truncate block">
              {ticket.category}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              SUB-CATEGORY
            </span>
            <span className="font-semibold text-slate-900 truncate block">
              {ticket.subCategory || (ticket.category === 'Network' ? 'GlobalProtect VPN' : ticket.category === 'Access Issue' ? 'Azure AD / MFA' : 'System Software')}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              DEPARTMENT
            </span>
            <span className="font-semibold text-slate-900 truncate block">
              {ticket.department || 'IT Support'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              ASSIGNED TO
            </span>
            <span className="font-bold text-sky-700 truncate block">
              {ticket.assignedAgent}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              ASSIGNED BY
            </span>
            <span className="font-semibold text-slate-800 truncate block">
              {ticket.assignedBy || (ticket.employee ? `${ticket.employee} (Requester)` : 'Unassigned')}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              ASSIGNED DATE
            </span>
            <span className="font-medium text-slate-700 truncate block">
              {formatDate(ticket.assignedDate || ticket.createdAt)}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              LAST UPDATED
            </span>
            <span className="font-medium text-slate-700 truncate block">
              {formatDate(ticket.updatedAt)}
            </span>
          </div>
        </div>

        {/* DESCRIPTION SECTION */}
        <div className="pt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            DESCRIPTION
          </span>
          <div className="bg-slate-50/80 border border-slate-200 p-4 rounded-xl text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>

        {/* ATTACHMENTS SECTION IN MAIN CARD */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              ATTACHMENTS ({attachments.length})
            </span>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setIsAttachmentModalOpen(true)}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>+ Add Attachment</span>
              </button>
            )}
          </div>

          {attachmentsLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-3 bg-slate-50 rounded-xl px-4 border border-slate-200">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
              <span>Loading ticket attachments...</span>
            </div>
          ) : attachmentsError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="font-semibold">Attachments could not be loaded.</p>
                  <p className="mt-0.5 text-[11px] text-amber-700">{attachmentsError}</p>
                  <button
                    type="button"
                    onClick={loadAttachments}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-800 hover:bg-amber-100 text-xs"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              </div>
            </div>
          ) : attachments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {attachments.map((att) => {
                const cleanName = att.name.includes(' (') ? att.name.split(' (')[0] : att.name;
                const extension = cleanName.split('.').pop()?.toUpperCase() || 'FILE';
                return (
                  <div
                    key={att.id || att.name}
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-white border border-slate-200 hover:border-sky-300 rounded-xl text-xs transition-all shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                        {extension.slice(0, 4)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate" title={cleanName}>
                          {cleanName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {att.size} {att.uploadedBy ? `• by ${att.uploadedBy}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleViewAttachment(att)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-sky-600 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="View inline preview"
                      >
                        <Eye className="w-3 h-3 text-slate-500" />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att.name, att.url)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Download attachment"
                      >
                        <Download className="w-3 h-3 text-sky-600" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-1">No attachments for this ticket.</p>
          )}
        </div>

        {/* RESOLUTION SUMMARY SECTION */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            RESOLUTION SUMMARY
          </span>
          {ticket.status === 'Resolved' ? (
            <div className="bg-emerald-50/80 border border-emerald-200/90 p-4 rounded-xl text-emerald-950 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs text-emerald-900 block mb-0.5">
                  Issue Resolved
                </span>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {ticket.resolutionSummary || 'Issue resolved by assigned employee after verifying configuration and running diagnostics.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">Work in Progress</span>
                <span className="text-slate-500">Ticket is currently open. Click "Mark as Resolved" when work is completed.</span>
              </div>
              <button
                onClick={() => setIsResolveModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Mark as Resolved
              </button>
            </div>
          )}
        </div>
      </div>

      {/* LOWER TAB PANEL: Activity, Notes, Attachments */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        {/* Tab Headers */}
        <div className="flex space-x-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('conversation')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
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
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
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
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'attachments'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            Attachments ({attachments.length})
          </button>
        </div>

        {/* Tab 1: Conversation & Internal Notes */}
        {activeTab === 'conversation' && (
          <div className="space-y-4">
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {ticket.comments?.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">
                  No replies recorded yet. Post an update or internal note below.
                </p>
              ) : (
                ticket.comments?.map((comment: TicketComment) => (
                  <div
                    key={comment.id}
                    className={`p-3.5 rounded-xl border text-xs ${
                      comment.isInternal
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{comment.authorName}</span>
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

            {/* Comment Form or Read-Only Notice */}
            {!isReadOnly ? (
              <form onSubmit={handlePostComment} className="pt-3 border-t border-slate-100">
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
                      <span>Add as Internal Team Note (Hidden from employee)</span>
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
                        ? 'Type internal team note...'
                        : 'Type response or update...'
                    }
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="absolute right-3 bottom-3 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Post Note
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 italic">
                  This ticket is open in read-only view. Edit controls and comment submission are hidden.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Audit History */}
        {activeTab === 'history' && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {ticket.activities?.map((act: TicketActivity) => (
              <div key={act.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{act.user}</span>
                  <span className="text-slate-600 ml-2">{act.action}</span>
                </div>
                <span className="text-[10px] text-slate-400">{formatDate(act.timestamp)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Attachments */}
        {activeTab === 'attachments' && (
          <div className="space-y-3">
            {attachmentsLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
                Loading attachments...
              </div>
            ) : attachmentsError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-semibold">Attachments could not be loaded.</p>
                    <p className="mt-0.5">{attachmentsError}</p>
                    <button
                      type="button"
                      onClick={loadAttachments}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            ) : attachments.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">No attachments uploaded yet.</p>
            ) : (
              attachments.map((att, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-sky-600" />
                    <div>
                      <p className="font-semibold text-slate-800">{att.name}</p>
                      <p className="text-[10px] text-slate-400">{att.size}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewAttachment(att)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3 text-slate-500" />
                      <span>View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(att.name, att.url)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3 h-3 text-sky-600" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: Escalate Ticket Modal */}
      {isEscalateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2 text-rose-600 font-bold text-base mb-1">
              <AlertTriangle className="w-5 h-5" />
              <span>Escalate Ticket</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Escalate ticket <span className="font-mono font-bold text-slate-700">{ticket.id}</span> to supervisory team lead or department management.
            </p>

            <form onSubmit={handleConfirmEscalation} className="space-y-4 text-xs">
              {/* Selected Team Lead */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Team Lead <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedTeamLead || user?.name || ''}
                  onChange={(e) => setSelectedTeamLead(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500 text-xs cursor-pointer font-medium"
                >
                  {(() => {
                    const deptLeads = OrganizationService.getTeamLeadsByDepartment(ticket.department || '');
                    const allLeads = deptLeads.length > 0 ? deptLeads : OrganizationService.getTeamLeadsByDepartment('IT Support');
                    const leadNames = Array.from(new Set([user?.name, ...allLeads.map(l => l.name), 'Kotesh', 'Manikanta', 'soniya'].filter(Boolean)));
                    return leadNames.map((name) => (
                      <option key={name} value={name}>
                        {name} {name === user?.name ? '(Current Lead)' : ''}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              {/* Reason Dropdown */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-rose-500 text-xs cursor-pointer"
                >
                  <option value="">Select an escalation reason...</option>
                  <option value="SLA Breach Risk">SLA Breach Risk</option>
                  <option value="Technical Complexity">Technical Complexity</option>
                  <option value="Management Urgency">Management Urgency</option>
                  <option value="Dependency on Third Party / Vendor">Dependency on Third Party / Vendor</option>
                  <option value="Requires Higher Privileges / Permissions">Requires Higher Privileges / Permissions</option>
                  <option value="Unresponsive Requester">Unresponsive Requester</option>
                  <option value="Hardware Replacement Required">Hardware Replacement Required</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Comment / Explanation Field */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Comment / Explanation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={escalationComment}
                  onChange={(e) => setEscalationComment(e.target.value)}
                  placeholder="Provide explanation or justification for escalating this ticket..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEscalateModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!escalationReason || !escalationComment.trim()}
                  className="px-4 py-2 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  Escalate Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Attachment Modal */}
      {isAttachmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-base mb-3">
              <Paperclip className="w-5 h-5 text-sky-600" />
              <span>Add Attachments to {ticket.id}</span>
            </div>

            <form onSubmit={handleConfirmAttachment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Attachment Files *
                </label>
                <AttachmentPicker
                  attachments={pendingAttachments}
                  onChange={setPendingAttachments}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachmentModalOpen(false);
                    setPendingAttachments([]);
                  }}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pendingAttachments.length === 0}
                  className="px-4 py-2 font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  Upload Attachments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Mark as Resolved Modal */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-base mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Resolve Ticket {ticket.id}</span>
            </div>

            <form onSubmit={handleConfirmResolve} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Resolution Summary *
                </label>
                <textarea
                  required
                  rows={4}
                  value={resolutionSummaryInput}
                  onChange={(e) => setResolutionSummaryInput(e.target.value)}
                  placeholder="Provide resolution details (e.g. Issue resolved after resetting VPN certificate and verifying connection with user)..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!resolutionSummaryInput.trim()}
                  className="px-4 py-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 transition-colors shadow-xs"
                >
                  Mark as Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">{previewAttachment.name}</h3>
              </div>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {(() => {
              const ext = (previewAttachment.name.split('.').pop() || '').toLowerCase();
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
              const isPdf = ext === 'pdf';
              return (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-80 overflow-auto">
                  {isImage && previewAttachment.viewUrl ? (
                    <img
                      src={previewAttachment.viewUrl}
                      alt={previewAttachment.name}
                      className="max-w-full max-h-72 mx-auto rounded-lg border border-slate-200 bg-white"
                    />
                  ) : isPdf && previewAttachment.viewUrl ? (
                    <iframe
                      src={previewAttachment.viewUrl}
                      title={previewAttachment.name}
                      className="w-full h-72 rounded-lg border border-slate-200 bg-white"
                    />
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">{previewAttachment.name}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Size: {previewAttachment.size || 'N/A'} — Inline preview is not available for this file type.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">Use the Download button below to open it.</p>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                onClick={() => handleDownloadAttachment(previewAttachment.name, previewAttachment.downloadUrl || previewAttachment.viewUrl?.replace('/view', '/download'))}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
