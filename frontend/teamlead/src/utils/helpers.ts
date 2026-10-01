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

export const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const formatSLAShort = (slaRemaining: string) => {
  if (!slaRemaining) return '';
  return slaRemaining.replace(/\s*remaining/i, '').trim();
};
