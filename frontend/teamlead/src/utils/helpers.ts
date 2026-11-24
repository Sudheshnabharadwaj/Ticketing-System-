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

export const getSLABadgeStyle = (sla: SLAStatus | string) => {
  const norm = String(sla || '').toLowerCase();
  if (norm.includes('breach') || norm.includes('overdue')) {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (norm.includes('risk')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (norm.includes('within') || norm.includes('normal') || norm.includes('on track')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
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

export interface SLAInfo {
  text: string;
  badgeStyle: string;
  isBreached: boolean;
  isRisk: boolean;
}

export const getTicketSLAInfo = (ticket: {
  slaRemaining?: string;
  slaStatus?: string;
  slaStatusRaw?: string;
  dueDate?: string;
  slaDeadline?: string;
  createdAt?: string;
  priority?: string;
  status?: string;
}): SLAInfo => {
  const normStatus = (ticket.status || '').toLowerCase();
  if (['resolved', 'closed'].includes(normStatus)) {
    return {
      text: 'Completed',
      badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      isBreached: false,
      isRisk: false,
    };
  }

  // 1. If backend already computed slaRemaining
  let rem = (ticket.slaRemaining || '').trim();
  const rawSla = String(ticket.slaStatusRaw || ticket.slaStatus || '').toLowerCase();

  if (rawSla.includes('breach') || rem.toLowerCase().includes('breach') || rem.toLowerCase().includes('overdue')) {
    return {
      text: 'Breached',
      badgeStyle: 'bg-red-50 text-red-700 border-red-200',
      isBreached: true,
      isRisk: false,
    };
  }

  if (rem && !rem.toLowerCase().includes('no sla')) {
    const clean = rem.replace(/\s*remaining/i, '').trim();
    if (clean) {
      const isRisk = rawSla.includes('risk');
      return {
        text: clean,
        badgeStyle: isRisk
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        isBreached: false,
        isRisk,
      };
    }
  }

  // 2. Client-side fallback dynamic calculation from createdAt/dueDate & priority
  const prio = (ticket.priority || '').toLowerCase();
  let slaHours = 24;
  if (prio === 'critical' || prio === 'urgent') slaHours = 4;
  else if (prio === 'high') slaHours = 8;
  else if (prio === 'medium') slaHours = 24;
  else if (prio === 'low') slaHours = 48;

  let deadlineMs = 0;
  const explicitDue = ticket.dueDate || ticket.slaDeadline;
  if (explicitDue && explicitDue.trim().length >= 10) {
    const parsed = new Date(
      explicitDue.includes(' ') && !explicitDue.includes('T')
        ? explicitDue.replace(' ', 'T')
        : explicitDue
    );
    if (!isNaN(parsed.getTime())) deadlineMs = parsed.getTime();
  }
  if (!deadlineMs && ticket.createdAt) {
    const cDate = new Date(
      ticket.createdAt.includes(' ') && !ticket.createdAt.includes('T')
        ? ticket.createdAt.replace(' ', 'T')
        : ticket.createdAt
    );
    if (!isNaN(cDate.getTime())) {
      deadlineMs = cDate.getTime() + slaHours * 60 * 60 * 1000;
    }
  }

  if (!deadlineMs) {
    return {
      text: ticket.slaStatus || 'Within SLA',
      badgeStyle: getSLABadgeStyle(ticket.slaStatus || 'Within SLA'),
      isBreached: false,
      isRisk: false,
    };
  }

  const now = Date.now();
  const diffMs = deadlineMs - now;
  if (diffMs <= 0) {
    return {
      text: 'Breached',
      badgeStyle: 'bg-red-50 text-red-700 border-red-200',
      isBreached: true,
      isRisk: false,
    };
  }

  const hours = Math.floor(diffMs / (3600 * 1000));
  const minutes = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const isRisk = hours < 4 || diffMs <= 4 * 3600 * 1000;

  return {
    text: timeStr,
    badgeStyle: isRisk
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    isBreached: false,
    isRisk,
  };
};

export const formatSLAShort = (slaRemaining: string) => {
  if (!slaRemaining) return '';
  const s = slaRemaining.trim();
  if (s.toLowerCase().includes('breach') || s.toLowerCase().includes('overdue')) return 'Breached';
  return s.replace(/\s*remaining/i, '').trim();
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
