import { Badge } from '../../components/ui/Badge';
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
import { formatDate, calculateSLADeadline, computeSLAStatus } from '../../utils/helpers';
import { OrganizationService } from '../../services/organizationService';
import { Ticket, TicketStatus, TicketPriority, TicketComment, TicketActivity } from '../../types/ticket';
import {
  ArrowLeft,
  Clock,
  UserCheck,
  User,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Send,
  Lock,
  MessageSquare,
  Activity,
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

    const handleUpdate = () => {
      void fetchTicket();
    };
    window.addEventListener('ticket-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('ticket-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [ticketId]);

  useEffect(() => {
    const updated = tickets.find((t) => t.id === ticketId);
    if (updated) {
      setTicketData((prev) => {
        if (!prev) return updated;
        return {
          ...updated,
          comments: prev.comments && prev.comments.length > 0 ? prev.comments : updated.comments,
          activities: prev.activities && prev.activities.length > 0 ? prev.activities : updated.activities,
          attachments: prev.attachments && prev.attachments.length > 0 ? prev.attachments : updated.attachments,
        };
      });
    }
  }, [tickets, ticketId]);

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

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment(ticket.id, user.name, role, newComment.trim(), isInternalNote);
    setNewComment('');
    const fresh = await ticketService.getTicketById(ticket.id);
    if (fresh) {
      setTicketData(fresh);
    }
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

    // Calculate chat access and permissions:
  // Tickets under My Tickets and Assigned Tickets have chat/reply access for the ticket creator
  // and assigned users who are working on the ticket. All other users have view-only access without chat or reply options.
  const isCreatedByMe = Boolean(
    (ticket as any).is_created_by_me === true ||
    (user?.id && (ticket.employeeId === user.id || (ticket as any).employee_id === user.id || (ticket as any).requester_id === user.id)) ||
    (user?.email && (ticket.employeeEmail?.toLowerCase() === user.email?.toLowerCase() || (ticket as any).employee_email?.toLowerCase() === user.email?.toLowerCase() || (ticket as any).requesterEmail?.toLowerCase() === user.email?.toLowerCase())) ||
    (user?.name && ticket.employee && ticket.employee.toLowerCase() === user.name.toLowerCase()) ||
    (user?.name && (ticket as any).requesterName && (ticket as any).requesterName.toLowerCase() === user.name.toLowerCase())
  );
  const isAssignedToMe = Boolean(
    (ticket as any).is_assigned_to_me === true ||
    (user?.id && ((ticket as any).assignedAgentId === user.id || (ticket as any).assigned_agent_id === user.id || (ticket as any).assignee_id === user.id)) ||
    (user?.email && ((ticket as any).assigned_agent_email?.toLowerCase() === user.email?.toLowerCase() || (ticket as any).assignedAgentEmail?.toLowerCase() === user.email?.toLowerCase() || (ticket as any).assignedToEmail?.toLowerCase() === user.email?.toLowerCase())) ||
    (user?.name && ticket.assignedAgent && ticket.assignedAgent.toLowerCase() === user.name.toLowerCase()) ||
    (user?.name && (ticket as any).assignedTo && (ticket as any).assignedTo.toLowerCase() === user.name.toLowerCase())
  );
  const canReply = Boolean(isCreatedByMe || isAssignedToMe || (ticket as any).can_reply === true);

  // Exact SLA Deadline & Status matching Admin view
  const deadlineDisplay = calculateSLADeadline(ticket.createdAt, ticket.priority, (ticket as any).dueDate || (ticket as any).sla_due_at || (ticket as any).slaDeadline);
  const rawStatus = (ticket as any).slaStatusRaw || computeSLAStatus(ticket.createdAt, ticket.priority, (ticket as any).dueDate || (ticket as any).sla_due_at || (ticket as any).slaDeadline, ticket.status);
  const slaStatusDisplay = (rawStatus === 'Within SLA' || rawStatus === 'COMPLIANT' || rawStatus === 'Compliant') ? 'Normal' : (rawStatus || 'Normal');

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
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-sky-600 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Tickets</span>
        </button>

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

      {/* Main Ticket Card - Exactly Matching Admin Dashboard Layout & Screenshot */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Ticket Header & Title */}
        <div className="p-6 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-xs font-bold text-[#0284C7] bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                {(ticket as any).ticketNumber || ticket.id}
              </span>
              <Badge priority={ticket.priority} />
              <Badge status={ticket.status} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 leading-snug">{ticket.subject}</h1>
          </div>

          {/* SLA Status Box - Exactly matching attached screenshot */}
          {(() => {
            const slaText = ticket.slaRemaining || ticket.slaStatus || (ticket as any).sla || '';
            const slaLower = String(slaText).toLowerCase();
            const rawStatusLower = String((ticket as any).slaStatusRaw || ticket.slaStatus || '').toLowerCase();
            const isBreached = rawStatusLower.includes('breached') || slaLower.includes('breached') || slaLower.includes('overdue');
            const isRisk = rawStatusLower.includes('risk') || slaLower.includes('risk') || /([1-3]h|\d+m remaining)/i.test(slaText);
            const isResolved = ticket.status === 'Resolved' || ticket.status === 'Closed';

            if (isResolved) {
              return (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-emerald-800 text-xs font-medium shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">SLA Status</div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black">COMPLETED</span>
                      <span className="text-slate-800 text-xs">{ticket.slaRemaining || 'Completed'}</span>
                    </div>
                  </div>
                </div>
              );
            }

            if (isBreached) {
              return (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-xl text-red-800 text-xs font-medium shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                  <div>
                    <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">SLA Status</div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black">SLA BREACHED</span>
                      <span className="text-slate-800 text-xs">{ticket.slaRemaining || 'Overdue'}</span>
                    </div>
                  </div>
                </div>
              );
            }

            if (isRisk) {
              return (
                <div className="flex items-center gap-2 bg-amber-50/50 border border-amber-200 px-3 py-2 rounded-xl text-amber-900 text-xs font-medium shrink-0">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">SLA STATUS</div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-black">SLA RISK</span>
                      <span className="font-bold text-slate-800 text-xs">{ticket.slaRemaining || '2h 04m remaining'}</span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-3 py-2 rounded-xl text-[#0284C7] text-xs font-medium shrink-0">
                <Clock className="w-4 h-4 text-[#0284C7]" />
                <div>
                  <div className="text-[10px] font-bold text-[#0284C7] uppercase tracking-wider">SLA STATUS</div>
                  <div className="font-bold text-slate-800 text-xs">{ticket.slaRemaining || 'Normal'}</div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 6 Metadata Fields Display Grid - Exactly matching attached screenshot */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 bg-white border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              CREATED BY
            </span>
            <div className="text-xs font-semibold text-slate-800">{ticket.employee || (ticket as any).requesterName || 'N/A'}</div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              CATEGORY
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.category}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              SUB-CATEGORY
            </span>
            <span className="text-xs font-semibold text-slate-800">
              {(ticket as any).subCategory || (ticket as any).sub_category || 'General Support'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              DEPARTMENT(S)
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.department || 'IT Support'}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              CREATED DATE
            </span>
            <span className="text-xs font-semibold text-slate-800">{formatDate(ticket.createdAt)}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              LAST UPDATED
            </span>
            <span className="text-xs font-semibold text-slate-800">{formatDate(ticket.updatedAt || ticket.createdAt)}</span>
          </div>
        </div>

        {/* Description Section */}
        <div className="p-6 bg-white border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            DESCRIPTION
          </h3>
          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>

        {/* Resolution Summary Section (if resolved) */}
        {ticket.status === 'Resolved' && (
          <div className="p-6 bg-emerald-50/60 border-b border-emerald-100">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Resolution Summary
            </h3>
            <div className="bg-white border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 leading-relaxed font-medium">
              {ticket.resolutionSummary || 'Issue resolved following standard troubleshooting & verification.'}
            </div>
          </div>
        )}

        {/* Attachments Section */}
        <div className="p-6 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              Attachments ({attachments.length})
            </h3>
          </div>

          {attachmentsLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-3 bg-slate-50 rounded-xl px-4 border border-slate-200">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0284C7]" />
              <span>Loading ticket attachments...</span>
            </div>
          ) : attachmentsError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
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
          ) : attachments.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {attachments.map((att) => {
                const cleanName = att.name.includes(' (') ? att.name.split(' (')[0] : att.name;
                return (
                  <div
                    key={att.id || att.name}
                    className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs text-slate-700 font-medium hover:border-[#0284C7] transition-all"
                  >
                    <div className="flex items-center gap-2 max-w-[200px] truncate">
                      <FileText className="w-4 h-4 text-[#0284C7] shrink-0" />
                      <span className="truncate" title={cleanName}>{cleanName}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleViewAttachment(att)}
                        className="p-1 hover:bg-slate-200/80 rounded text-slate-500 hover:text-[#0284C7] transition-colors cursor-pointer"
                        title="View Attachment"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att.name, att.url)}
                        className="p-1 hover:bg-slate-200/80 rounded text-slate-500 hover:text-[#0284C7] transition-colors cursor-pointer"
                        title="Download Attachment"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No files attached to this ticket.</p>
          )}
        </div>
      </div>

      {/* 3 Main Sections: Conversation & Notes, Audit History, Attachments */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        {/* Tab Headers */}
        <div className="flex space-x-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('conversation')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'conversation'
                ? 'bg-[#0284C7] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Conversation & Notes ({ticket.comments?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#0284C7] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            Audit History ({ticket.activities?.length || (ticket as any).history?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attachments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'attachments'
                ? 'bg-[#0284C7] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            Attachments ({attachments.length})
          </button>
        </div>

        {/* Tab 1: Conversation & Notes */}
        {activeTab === 'conversation' && (
          <div className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {!ticket.comments || ticket.comments.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">
                  No replies recorded yet.
                </p>
              ) : (
                ticket.comments.map((comment: TicketComment) => (
                  <div
                    key={comment.id}
                    className={`p-3.5 rounded-xl border text-xs mb-3 ${
                      comment.isInternal
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                        : 'bg-white border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{comment.authorName}</span>
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-md bg-slate-100 text-slate-600">
                          {comment.authorRole}
                        </span>
                        {comment.isInternal && (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md">
                            <Lock className="w-3 h-3 mr-1" /> Internal Note
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{comment.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Chat/Reply access: for creator and assigned user working on the ticket */}
            {canReply && (
              <form onSubmit={handlePostComment} className="pt-4 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Send a Reply</label>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Add as Internal Team Note (Hidden from employee)</span>
                  </label>
                </div>

                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={isInternalNote ? 'Type internal team note...' : 'Type your reply or progress update here...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20"
                />

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isInternalNote ? 'Post Internal Note' : 'Send Reply'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Audit History */}
        {activeTab === 'history' && (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {ticket.activities && ticket.activities.length > 0 ? (
              ticket.activities.map((item: TicketActivity) => (
                <div key={item.id} className="flex items-start gap-3 text-xs">
                  <div className="w-8 h-8 rounded-full bg-sky-50 border border-sky-100 text-[#0284C7] flex items-center justify-center font-bold shrink-0 mt-0.5">
                    {item.user.charAt(0)}
                  </div>
                  <div className="flex-1 bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{item.user}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{formatDate(item.timestamp)}</span>
                    </div>
                    <p className="text-slate-700">{item.action}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-slate-400 py-6">No audit activities recorded for this ticket.</p>
            )}
          </div>
        )}

        {/* Tab 3: Attachments */}
        {activeTab === 'attachments' && (
          <div className="space-y-3">
            {attachmentsLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0284C7]" />
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
                    <FileText className="w-4 h-4 text-[#0284C7]" />
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
