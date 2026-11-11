import { TicketPriority, TicketStatus, SLAStatus } from '../types/ticket';

export const getStatusBadgeStyle = (status: TicketStatus) => {
  switch (status) {
    case 'Open':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'In Progress':
      return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'Pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Resolved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Closed':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'Escalated':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

export const getPriorityBadgeStyle = (priority: TicketPriority) => {
  switch (priority) {
    case 'Low':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'Medium':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'High':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Critical':
      return 'bg-red-50 text-red-700 border-red-200 font-semibold animate-pulse';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

export const getSLABadgeStyle = (sla: SLAStatus) => {
  switch (sla) {
    case 'Within SLA':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'At Risk':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Breached':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

export const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  let s = dateString;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) && !s.includes('Z') && !s.includes('+')) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const date = new Date(s);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

export const formatSLAShort = (slaRemaining: string) => {
  if (!slaRemaining) return '';
  return slaRemaining.replace(/\s*remaining/i, '').trim();
};

export function calculateSLADeadline(
  createdAtStr?: string,
  priority?: string,
  explicitDueDate?: string
): string {
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
    const cleanDue = explicitDueDate.replace('T', ' ').slice(0, 16);
    return cleanDue;
  }

  const prio = (priority || '').toLowerCase();
  let hoursToAdd = 24;
  if (prio === 'critical' || prio === 'urgent') hoursToAdd = 4;
  else if (prio === 'high') hoursToAdd = 8;
  else if (prio === 'medium') hoursToAdd = 24;
  else if (prio === 'low') hoursToAdd = 48;

  const createdTime = createdAtStr
    ? new Date(createdAtStr.includes(' ') && !createdAtStr.includes('T')
        ? createdAtStr.replace(' ', 'T')
        : createdAtStr)
    : new Date();
  const validCreated = isNaN(createdTime.getTime()) ? new Date() : createdTime;
  const deadline = new Date(validCreated.getTime() + hoursToAdd * 60 * 60 * 1000);
  const yyyy = deadline.getFullYear();
  const mm = String(deadline.getMonth() + 1).padStart(2, '0');
  const dd = String(deadline.getDate()).padStart(2, '0');
  const hh = String(deadline.getHours()).padStart(2, '0');
  const min = String(deadline.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function computeSLAStatus(
  createdAtStr?: string,
  priority?: string,
  explicitDueDate?: string,
  status?: string
): string {
  const normStatus = (status || '').toLowerCase();
  if (['resolved', 'closed'].includes(normStatus)) {
    return 'Normal';
  }

  const prio = (priority || '').toLowerCase();
  let slaHours = 24;
  if (prio === 'critical' || prio === 'urgent') slaHours = 4;
  else if (prio === 'high') slaHours = 8;
  else if (prio === 'medium') slaHours = 24;
  else if (prio === 'low') slaHours = 48;

  let deadlineMs = 0;
  if (explicitDueDate && explicitDueDate.trim() && explicitDueDate.length >= 10) {
    const parsed = new Date(
      explicitDueDate.includes(' ') && !explicitDueDate.includes('T')
        ? explicitDueDate.replace(' ', 'T')
        : explicitDueDate
    );
    if (!isNaN(parsed.getTime())) deadlineMs = parsed.getTime();
  }
  if (!deadlineMs && createdAtStr) {
    const cDate = new Date(
      createdAtStr.includes(' ') && !createdAtStr.includes('T')
        ? createdAtStr.replace(' ', 'T')
        : createdAtStr
    );
    if (!isNaN(cDate.getTime())) {
      deadlineMs = cDate.getTime() + slaHours * 60 * 60 * 1000;
    }
  }

  if (!deadlineMs) return 'Normal';

  const now = Date.now();
  if (now > deadlineMs) {
    return 'SLA Breached';
  }
  const fourHoursMs = 4 * 60 * 60 * 1000;
  if (deadlineMs - now <= fourHoursMs) {
    return 'SLA Risk';
  }
  return 'Normal';
}
