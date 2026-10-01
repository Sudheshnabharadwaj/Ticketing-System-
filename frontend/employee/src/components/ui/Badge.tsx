import React from 'react';
import type { TicketPriority, TicketStatus } from '../../types';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' | 'indigo';

interface BadgeProps {
  variant?: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
  dot?: boolean;
  priority?: TicketPriority;
  status?: TicketStatus;
}

export const Badge: React.FC<BadgeProps> = ({
  variant,
  children,
  className = '',
  dot = false,
  priority,
  status,
}) => {
  let computedVariant: BadgeVariant = variant || 'neutral';
  let labelText = children;
  let hasDot = dot;

  if (priority) {
    labelText = priority;
    hasDot = true;
    if (priority === 'Urgent') computedVariant = 'danger';
    else if (priority === 'High') computedVariant = 'warning';
    else if (priority === 'Medium') computedVariant = 'info';
    else computedVariant = 'neutral';
  } else if (status) {
    labelText = status;
    if (status === 'Resolved' || status === 'Closed') computedVariant = 'success';
    else if (status === 'In Progress') computedVariant = 'info';
    else if (status === 'Pending' || status === 'Escalated') computedVariant = 'warning';
    else computedVariant = 'neutral';
  }

  const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-sky-50 text-[#0284C7] border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-sky-50 text-[#0284C7] border-sky-200',
    indigo: 'bg-sky-50 text-[#0284C7] border-sky-200',
  };

  const dotColors: Record<BadgeVariant, string> = {
    success: 'bg-emerald-600',
    warning: 'bg-amber-500',
    danger: 'bg-red-600',
    info: 'bg-[#0284C7]',
    neutral: 'bg-slate-500',
    primary: 'bg-[#0284C7]',
    indigo: 'bg-[#0284C7]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variantStyles[computedVariant]} ${className}`}
    >
      {hasDot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[computedVariant]}`} />}
      {labelText}
    </span>
  );
};
