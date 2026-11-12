import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  User,
  Users,
  Paperclip,
  Send,
  CheckCircle2,
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Activity,
  MessageSquare,
  Eye,
  Download,
  Trash2,
  X,
  RefreshCw
} from 'lucide-react';
import {
  EmployeeService,
  BACKEND_API_URL,
  fetchBackendAttachmentsDetailed,
  deleteBackendAttachment,
  getEmployeeSessionUser,
  isUserChatMessage,
} from '../services/employeeService';
import { authenticatedFetch, ensureBackendSession, withAccessToken } from '../services/backendAuth';
import { supabase } from '../services/supabaseClient';
import type { EmployeeTicket, TicketStatus } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { AttachmentFilePicker, type AttachedFile } from '../components/ui/AttachmentFilePicker';

export const AssignedTicketDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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

  const [ticket, setTicket] = useState<EmployeeTicket | null>(() => (id ? EmployeeService.getTicketById(id) || null : null));
  const [newComment, setNewComment] = useState('');
  const [commentAttachedFiles, setCommentAttachedFiles] = useState<AttachedFile[]>([]);
  const [activeTab, setActiveTab] = useState<'conversation' | 'attachments'>('conversation');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>('In Progress');
  const [statusNote, setStatusNote] = useState('');

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('Lack of Knowledge');
  const [escalateComment, setEscalateComment] = useState('');

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionText, setResolutionText] = useState('');

  const currentUser = getEmployeeSessionUser();
  const isAssignedToMe = Boolean(
    ticket && (
      (ticket as any).is_assigned_to_me === true ||
      (currentUser?.id && ((ticket as any).assignedAgentId === currentUser.id || (ticket as any).assignee_id === currentUser.id)) ||
      (currentUser?.email && ((ticket as any).assignedToEmail?.toLowerCase() === currentUser.email?.toLowerCase() || (ticket as any).assignedAgentEmail?.toLowerCase() === currentUser.email?.toLowerCase())) ||
      (currentUser?.name && (ticket.assignedTo?.toLowerCase() === currentUser.name?.toLowerCase() || (ticket as any).assignedAgent?.toLowerCase() === currentUser.name?.toLowerCase()))
    )
  );
  const isCreatedByMe = Boolean(
    ticket && (
      (ticket as any).is_created_by_me === true ||
      (currentUser?.id && ((ticket as any).requester_id === currentUser.id || (ticket as any).employee_id === currentUser.id)) ||
      (currentUser?.email && ((ticket as any).requesterEmail?.toLowerCase() === currentUser.email?.toLowerCase() || (ticket as any).employeeEmail?.toLowerCase() === currentUser.email?.toLowerCase())) ||
      (currentUser?.name && ((ticket as any).requesterName?.toLowerCase() === currentUser.name?.toLowerCase() || (ticket as any).employee?.toLowerCase() === currentUser.name?.toLowerCase()))
    )
  );
  const isTagged = Boolean(
    currentUser?.id && (
      ((ticket as any)?.tagged_employee_ids || []).includes(currentUser.id) ||
      ((ticket as any)?.employees || []).some((e: any) => (typeof e === 'object' && e?.id === currentUser.id) || e === currentUser.id)
    )
  );
  const isWorkMode = searchParams.get('mode') === 'work';
  const canReply = Boolean(
    (isCreatedByMe || isWorkMode || (isAssignedToMe && !isReadOnly)) &&
    (isAssignedToMe || isCreatedByMe || isTagged || (ticket as any)?.can_reply === true)
  );
  const canDeleteAttachment = Boolean(currentUser?.role === 'admin' || isAssignedToMe || isCreatedByMe || canReply);
  const canWorkOnTicket = isAssignedToMe || isCreatedByMe;

  const [showAttachModal, setShowAttachModal] = useState(false);
  const [modalAttachedFiles, setModalAttachedFiles] = useState<AttachedFile[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; size?: string; viewUrl?: string } | null>(null);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const getAttachmentRawName = (file: any): string => {
    if (!file) return '';
    if (typeof file === 'string') {
      return file.includes(' (') ? file.split(' (')[0] : file;
    }
    return file.name || file.filename || file.id || '';
  };

  const getAttachmentDisplayName = (file: any): string => {
    if (!file) return '';
    if (typeof file === 'string') return file;
    if (file.name) {
      return file.size && file.size !== 'N/A' ? `${file.name} (${file.size})` : file.name;
    }
    return String(file);
  };

  const getAttachmentSize = (file: any): string => {
    if (!file) return 'N/A';
    if (typeof file === 'string') {
      return file.includes('(') ? file.split('(')[1].replace(')', '') : 'N/A';
    }
    return file.size && file.size !== 'N/A' ? String(file.size) : 'N/A';
  };

  const handleDownloadAttachment = async (fileName: any) => {
    const cleanName = getAttachmentRawName(fileName);
    const ticketId = ticket?.ticketNumber || ticket?.id;
    try {
      await ensureBackendSession();
      const res = await authenticatedFetch(`${BACKEND_API_URL}/tickets/${ticketId}/attachments/${encodeURIComponent(cleanName)}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = cleanName.includes('.') ? cleanName : `${cleanName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setToastMessage(`Downloading ${cleanName}`);
        setTimeout(() => setToastMessage(null), 3000);
        return;
      }
      setToastMessage(`Could not download "${cleanName}" (not found).`);
    } catch {
      setToastMessage(`Could not download "${cleanName}". Please try again.`);
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteAttachment = async (fileName: any) => {
    const rawName = getAttachmentRawName(fileName);
    const ticketId = (ticket as any)?.ticketNumber || (ticket as any)?.id || id;
    if (!ticketId) return;
    if (!canDeleteAttachment) {
      setToastMessage('You are not authorized to delete attachments on this ticket.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete attachment "${rawName}"? This action cannot be undone.`)) {
      return;
    }
    // Optimistic UI removal
    setTicket((prev) =>
      prev
        ? {
            ...prev,
            attachments: (prev.attachments || []).filter((f) => {
              const fName = getAttachmentRawName(f);
              return !(f === fileName || fName === rawName || fName.includes(rawName));
            }),
          }
        : prev
    );

    const success = await deleteBackendAttachment(ticketId, rawName);
    if (success) {
      setToastMessage(`Attachment "${rawName}" deleted successfully.`);
      await reloadAttachments();
    } else {
      setToastMessage(`Failed to delete attachment "${rawName}". Please try again.`);
      await reloadAttachments();
    }
  };

  const handleViewAttachment = async (fileName: any) => {
    const cleanName = getAttachmentRawName(fileName);
    const size = getAttachmentSize(fileName);
    await ensureBackendSession();
    const ticketId = ticket?.ticketNumber || ticket?.id;
    const viewUrl = withAccessToken(
      `${BACKEND_API_URL}/tickets/${ticketId}/attachments/${encodeURIComponent(cleanName)}/view`,
    );
    setPreviewAttachment({ name: cleanName, size, viewUrl });
  };

  const [isLoading, setIsLoading] = useState(() => !id || !EmployeeService.getTicketById(id));

  const loadTicket = async () => {
    if (!id) return;
    if (!ticket && !EmployeeService.getTicketById(id)) {
      setIsLoading(true);
    }
    setAttachmentsLoading(true);
    setAttachmentsError(null);

    // Always fetch fresh ticket data directly from backend
    const found = await EmployeeService.getTicketByIdAsync(id);
    if (found) {
      setTicket({ ...found });
      setSelectedStatus(found.status);
    } else {
      const cached = EmployeeService.getTicketById(id);
      if (cached) {
        setTicket({ ...cached });
        setSelectedStatus(cached.status);
      }
    }

    const attachmentResult = await fetchBackendAttachmentsDetailed(id);
    setAttachmentsError(attachmentResult.error);
    setTicket((prev) =>
      prev ? { ...prev, attachments: attachmentResult.attachments } : prev,
    );

    setAttachmentsLoading(false);
    setIsLoading(false);
  };

  const reloadAttachments = async () => {
    if (!id) return;
    setAttachmentsLoading(true);
    setAttachmentsError(null);
    const result = await fetchBackendAttachmentsDetailed(id);
    setTicket((prev) => (prev ? { ...prev, attachments: result.attachments } : prev));
    setAttachmentsError(result.error);
    setAttachmentsLoading(false);
  };

  useEffect(() => {
    loadTicket();
    const handleUpdate = () => {
      loadTicket();
    };
    window.addEventListener('ticket-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('ticket-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [id]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Live automatic background comments sync without page refresh
  useEffect(() => {
    const tid = ticket?.id || (ticket as any)?.ticketNumber || id;
    if (!tid) return;

    let isMounted = true;
    const fetchLatestComments = async () => {
      try {
        const { data: dbComments } = await supabase
          .from('ticket_comments')
          .select('*')
          .eq('ticket_id', tid)
          .order('created_at', { ascending: true });

        if (dbComments && isMounted) {
          const mapped = dbComments
            .filter((c: any) => isUserChatMessage(c))
            .map((c: any) => ({
              id: c.id,
              ticketId: c.ticket_id,
              authorName: c.author_name || 'User',
              authorRole: (c.author_role || 'EMPLOYEE').toUpperCase(),
              message: c.message || '',
              createdAt: c.created_at,
              isInternal: !!c.is_internal,
            }));

          setTicket((prev) => {
            if (!prev) return prev;
            const currentComments = prev.comments || [];
            const prevIds = currentComments.map((c: any) => c.id).filter((cid: string) => !cid.startsWith('temp-')).join(',');
            const newIds = mapped.map((c: any) => c.id).join(',');
            if (prevIds !== newIds) {
              const pendingOptimistic = currentComments.filter((c: any) => c.id.startsWith('temp-'));
              return { ...prev, comments: [...mapped, ...pendingOptimistic] };
            }
            return prev;
          });
        }
      } catch (err) {
        // silent sync
      }
    };

    const channel = supabase
      .channel(`employee-live-comments-${tid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_comments', filter: `ticket_id=eq.${tid}` },
        () => {
          void fetchLatestComments();
        }
      )
      .subscribe();

    const interval = setInterval(fetchLatestComments, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [ticket?.id, id]);

  if (isLoading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto mt-12 shadow-2xs font-sans">
        <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading ticket details...</p>
      </div>
    );
  }

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
          onClick={() => navigate('/employee/dashboard')}
          className="bg-[#0284C7] hover:bg-[#0369a1] text-white"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const calculateSLADeadline = (createdAtStr?: string, priority?: string, explicitDueDate?: string): string => {
    if (explicitDueDate && explicitDueDate.trim() && explicitDueDate.length >= 10) {
      const raw = explicitDueDate.includes(' ') && !explicitDueDate.includes('T')
        ? explicitDueDate.replace(' ', 'T')
        : explicitDueDate;
      const due = new Date(raw);
      if (!isNaN(due.getTime())) {
        const yyyy = due.getFullYear();
        const mm = String(due.getMonth() + 1).padStart(2, '0');
        const dd = String(due.getDate()).padStart(2, '0');
        const hh = String(due.getHours()).padStart(2, '0');
        const min = String(due.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      }
      return explicitDueDate.replace('T', ' ').slice(0, 16);
    }
    const base = createdAtStr ? new Date(createdAtStr.includes(' ') ? createdAtStr.replace(' ', 'T') : createdAtStr) : new Date();
    const valid = isNaN(base.getTime()) ? new Date() : base;
    const hoursMap: Record<string, number> = { Critical: 4, High: 12, Medium: 24, Low: 48 };
    const hrs = hoursMap[priority || 'Medium'] || 24;
    const deadline = new Date(valid.getTime() + hrs * 60 * 60 * 1000);
    const yyyy = deadline.getFullYear();
    const mm = String(deadline.getMonth() + 1).padStart(2, '0');
    const dd = String(deadline.getDate()).padStart(2, '0');
    const hh = String(deadline.getHours()).padStart(2, '0');
    const min = String(deadline.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  };

  const formatDisplayDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    let s = dateStr;
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) && !s.includes('Z') && !s.includes('+')) {
      s = s.replace(' ', 'T') + 'Z';
    }
    const d = new Date(s);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const deadlineDisplay = calculateSLADeadline(ticket.createdAt, ticket.priority, (ticket as any).dueDate || (ticket as any).slaDeadline || (ticket as any).sla_due_at);

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
    const commentText = newComment.trim();
    if (!id || !commentText) return;

    const attachmentStr = commentAttachedFiles.map((f) => `${f.name} (${f.size})`).join(', ');
    const fullMessage = commentText + (attachmentStr ? ` (Attachment: ${attachmentStr})` : '');
    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();

    // 1. Optimistic Update: display sent message immediately & clear input
    const optimisticComment: any = {
      id: tempId,
      ticketId: id,
      authorName: currentUser?.name || 'Employee',
      authorRole: 'EMPLOYEE',
      message: fullMessage,
      createdAt: nowIso,
      isInternal: false,
    };

    setTicket((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: [...(prev.comments || []), optimisticComment],
      };
    });
    setNewComment('');
    setCommentAttachedFiles([]);
    setToastMessage('Reply posted successfully.');

    // 2. Persist in database asynchronously
    try {
      const updated = await EmployeeService.addComment(id, commentText, attachmentStr || undefined);
      if (!updated) {
        // Direct Supabase fallback for guaranteed permanent storage
        await supabase.from('ticket_comments').insert({
          id: `comm-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
          ticket_id: id,
          author_user_id: currentUser?.id || null,
          author_name: currentUser?.name || 'Employee',
          author_role: 'employee',
          message: fullMessage,
          is_internal: false,
          created_at: nowIso,
        });
      }
    } catch (err) {
      console.warn('Error saving comment in background:', err);
      try {
        await supabase.from('ticket_comments').insert({
          id: `comm-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
          ticket_id: id,
          author_user_id: currentUser?.id || null,
          author_name: currentUser?.name || 'Employee',
          author_role: 'employee',
          message: fullMessage,
          is_internal: false,
          created_at: nowIso,
        });
      } catch {}
    }
  };

  const handleAddAttachmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || modalAttachedFiles.length === 0) return;
    const updatedTicket = await EmployeeService.addAttachment(id, modalAttachedFiles.map((f) => f.file).filter((f): f is File => !!f));
    if (updatedTicket) {
      const attachmentResult = await fetchBackendAttachmentsDetailed(id);
      setTicket({ ...updatedTicket, attachments: attachmentResult.attachments });
      setAttachmentsError(attachmentResult.error);
      setModalAttachedFiles([]);
      setShowAttachModal(false);
      setToastMessage(`${modalAttachedFiles.length} file(s) attached successfully.`);
    } else {
      setToastMessage('Attachment upload failed.');
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

        <div className="flex flex-wrap items-center gap-2">
          {isReadOnly ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              View
            </span>
          ) : (
            <>
              {isAssignedToMe && (
                <>
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

                  {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && ticket.status !== 'Escalated' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEscalateModal(true)}
                      className="border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-100/60 font-semibold text-xs cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Escalate
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAttachModal(true)}
                    className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5 mr-1" />
                    Add Attachment
                  </Button>

                  {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowResolveModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Mark as Resolved
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </div>
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

          {/* SLA Badge */}
          <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-3 py-2 rounded-xl text-[#0284C7] text-xs font-medium shrink-0">
            <Clock className="w-4 h-4 text-[#0284C7]" />
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SLA Deadline</span>
              </div>
              <div className="font-bold text-slate-800">{deadlineDisplay}</div>
              <div className="text-[10px] font-semibold text-[#0284C7] mt-0.5">{(ticket as any).slaStatus || ticket.sla || 'Normal'}</div>
            </div>
          </div>
        </div>

        {/* 11 Metadata Fields Display Grid */}
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
            <span className="text-xs font-semibold text-slate-800">{ticket.department || 'IT Support'}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Category
            </span>
            <span className="text-xs font-semibold text-slate-800">{ticket.category}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Created By
            </span>
            <div className="text-xs font-semibold text-slate-800">
              {(ticket as any).requesterName || (ticket as any).employee || 'N/A'}
            </div>
            {((ticket as any).requesterEmail || (ticket as any).employeeEmail) && (
              <div className="text-[10px] font-mono text-slate-400">
                {(ticket as any).requesterEmail || (ticket as any).employeeEmail}
              </div>
            )}
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Assigned Employee
            </span>
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#0284C7]" />
              {ticket.assignedTo || (ticket as any).assignedAgent || (ticket as any).assigneeName || 'Unassigned'}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Created Date
            </span>
            <span className="text-xs font-semibold text-slate-800">{formatDisplayDate(ticket.createdAt)}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Last Updated Date
            </span>
            <span className="text-xs font-semibold text-slate-800">{formatDisplayDate(ticket.updatedAt || ticket.createdAt)}</span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              SLA Status
            </span>
            <span className="text-xs font-semibold text-slate-800">{(ticket as any).slaStatus || ticket.sla || 'Normal'}</span>
          </div>

          <div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                SLA Deadline
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-800">{deadlineDisplay}</span>
          </div>

          {((ticket as any).escalationReason || (ticket as any).escalation_reason || ticket.status === 'Escalated') && (
            <div className="col-span-2 sm:col-span-3 lg:col-span-4 p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <div>
                <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block mb-0.5">
                  Escalation Reason
                </span>
                <span className="text-xs font-semibold text-red-950">
                  {(ticket as any).escalationReason || (ticket as any).escalation_reason || 'Ticket escalated for senior review'}
                </span>
              </div>
              {((ticket as any).escalationNotes || (ticket as any).escalation_notes) && (
                <div className="pt-2 border-t border-red-200/60">
                  <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider block mb-0.5">
                    Escalation Note
                  </span>
                  <span className="text-xs text-red-900 whitespace-pre-wrap">
                    {(ticket as any).escalationNotes || (ticket as any).escalation_notes}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="p-6 bg-white border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            DESCRIPTION
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
              ATTACHMENTS ({ticket.attachments?.length || 0})
            </h3>
            {!isReadOnly && canWorkOnTicket && (
              <button
                type="button"
                onClick={() => setShowAttachModal(true)}
                className="text-xs font-semibold text-[#0284C7] hover:underline cursor-pointer flex items-center gap-1"
              >
                + Upload File
              </button>
            )}
          </div>

          {attachmentsLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0284C7]" />
              Loading attachments...
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
                    onClick={reloadAttachments}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              </div>
            </div>
          ) : ticket.attachments && ticket.attachments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ticket.attachments.map((file, idx) => {
                const cleanName = getAttachmentRawName(file);
                const size = getAttachmentSize(file);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-[#0284C7] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <FileText className="w-4 h-4 text-[#0284C7] shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{cleanName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{size}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleViewAttachment(file)}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-slate-500" />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(file)}
                        className="px-2 py-1 text-[11px] font-semibold text-[#0284C7] bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3 text-[#0284C7]" />
                        <span>Download</span>
                      </button>
                      {canDeleteAttachment && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(file)}
                          className="px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No attachments uploaded yet.</p>
          )}
        </div>
      </div>

      {/* 2 Main Sections: Conversation & Notes, Attachments */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center gap-2 p-3 border-b border-slate-100 bg-slate-50/50">
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
            onClick={() => setActiveTab('attachments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'attachments'
                ? 'bg-[#0284C7] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            Attachments ({ticket.attachments?.length || 0})
          </button>
        </div>

        {/* Tab 1: Conversation & Notes */}
        {activeTab === 'conversation' && (
          <div className="p-6 space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {!ticket.comments || ticket.comments.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">
                  No replies recorded yet. Post a comment or reply below.
                </p>
              ) : (
                ticket.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-white text-xs text-slate-800"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{comment.authorName}</span>
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-md bg-slate-100 text-slate-600">
                          {comment.authorRole}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{comment.createdAt}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{comment.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form - Authorized creator and assigned employee can reply; all others have view-only access without chat/reply options */}
            {canReply && (
              <form onSubmit={handleAddCommentSubmit} className="pt-4 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-700">Send a Reply</label>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type your reply or progress update here..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/20"
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
                    Send Reply
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Attachments */}
        {activeTab === 'attachments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Attached Files ({ticket.attachments?.length || 0})
              </span>
              <button
                type="button"
                onClick={() => setShowAttachModal(true)}
                className="text-xs font-semibold text-[#0284C7] hover:underline cursor-pointer flex items-center gap-1"
              >
                + Upload File
              </button>
            </div>
            {attachmentsLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0284C7]" />
                Loading attachments...
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
                      onClick={reloadAttachments}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            ) : ticket.attachments && ticket.attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ticket.attachments.map((file, idx) => {
                  const cleanName = getAttachmentRawName(file);
                  const size = getAttachmentSize(file);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs hover:border-[#0284C7] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <FileText className="w-4 h-4 text-[#0284C7] shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{cleanName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{size}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleViewAttachment(file)}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(file)}
                          className="px-2 py-1 text-[11px] font-semibold text-[#0284C7] bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3 text-[#0284C7]" />
                          <span>Download</span>
                        </button>
                        {canDeleteAttachment && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(file)}
                            className="px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No files attached to this ticket.</p>
            )}
          </div>
        )}
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
                    { value: 'Lack of Knowledge', label: 'Lack of Knowledge' },
                    { value: 'Insufficient Authority', label: 'Insufficient Authority' },
                    { value: 'Active SLA Breach', label: 'Active SLA Breach' },
                    { value: 'Third-Party Dependencies', label: 'Third-Party Dependencies' },
                    { value: 'Recurring/Repeating Issues', label: 'Recurring/Repeating Issues' },
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
                existingAttachments={ticket.attachments}
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

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[#0284C7]" />
                <h3 className="font-bold text-slate-900 text-sm truncate">{previewAttachment.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              {/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(previewAttachment.name) && previewAttachment.viewUrl ? (
                <img
                  src={previewAttachment.viewUrl}
                  alt={previewAttachment.name}
                  className="max-h-60 w-full object-contain bg-white"
                  onError={() => setPreviewAttachment((p) => (p ? { ...p, viewUrl: undefined } : p))}
                />
              ) : /\.pdf$/i.test(previewAttachment.name) && previewAttachment.viewUrl ? (
                <iframe
                  src={previewAttachment.viewUrl}
                  title={previewAttachment.name}
                  className="w-full h-60 bg-white"
                />
              ) : (
                <div className="p-4 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">{previewAttachment.name}</p>
                  <p className="mt-1">Size: {previewAttachment.size || 'N/A'}</p>
                  <p className="mt-1 text-slate-500">
                    Inline preview is not available for this file type. Use Download to open it.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDownloadAttachment(previewAttachment.name)}
                className="px-3 py-1.5 bg-[#0284C7] hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
              <button
                type="button"
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
