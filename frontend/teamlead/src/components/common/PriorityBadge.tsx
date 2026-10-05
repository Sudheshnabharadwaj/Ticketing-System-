import React from 'react';
import { TicketPriority } from '../../types/ticket';
import { getPriorityBadgeStyle } from '../../utils/helpers';
import { AlertCircle, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

interface PriorityBadgeProps {
  priority: TicketPriority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'sm' }) => {
  const style = getPriorityBadgeStyle(priority);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px] font-semibold' : 'px-2 py-0.5 text-xs font-semibold';

  const renderIcon = () => {
    switch (priority) {
      case 'Critical':
        return <AlertCircle className="w-3 h-3 mr-1 shrink-0" />;
      case 'High':
        return <AlertTriangle className="w-3 h-3 mr-1 shrink-0" />;
      case 'Medium':
        return <ArrowUp className="w-3 h-3 mr-1 shrink-0" />;
      case 'Low':
        return <ArrowDown className="w-3 h-3 mr-1 shrink-0" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded border whitespace-nowrap ${sizeClasses} ${style}`}
    >
      {renderIcon()}
      {priority}
    </span>
  );
};
