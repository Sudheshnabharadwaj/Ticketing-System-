import React from 'react';
import { TicketStatus } from '../../types/ticket';
import { getStatusBadgeStyle } from '../../utils/helpers';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const style = getStatusBadgeStyle(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px] font-medium' : 'px-2 py-0.5 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border whitespace-nowrap ${sizeClasses} ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1 bg-current opacity-80 shrink-0" />
      {status}
    </span>
  );
};
