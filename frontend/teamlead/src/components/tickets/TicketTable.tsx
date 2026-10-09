import React, { useState } from 'react';
import { Ticket } from '../../types/ticket';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { formatDate, getSLABadgeStyle, formatSLAShort } from '../../utils/helpers';
import { AssignTicketModal } from './AssignTicketModal';
import {
  Eye,
  UserCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTickets } from '../../hooks/useTickets';

interface TicketTableProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onAssignTicket?: (ticket: Ticket) => void;
  showActionsColumn?: boolean;
  tableType?: 'team' | 'assigned' | 'my';
}

export const TicketTable: React.FC<TicketTableProps> = ({
  tickets,
  onSelectTicket,
  onAssignTicket,
  showActionsColumn = true,
  tableType = 'team',
}) => {
  const { role } = useAuth();
  const { changePriority, escalateTicket, resolveTicket, workOnTicket } = useTickets();

  // Fallback internal Assign Ticket modal state
  const [internalAssignTicket, setInternalAssignTicket] = useState<Ticket | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleAssignClick = (ticket: Ticket, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAssignTicket) {
      onAssignTicket(ticket);
    } else {
      setInternalAssignTicket(ticket);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Determine widths based on tableType
  const isMyTable = tableType === 'my';
  const isTeamTable = tableType === 'team';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden w-full max-w-full min-w-0 relative">
      {/* Toast Notification if managed internally */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      <div className="w-full max-w-full overflow-x-auto">
        <table className="w-full min-w-[850px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 w-32 whitespace-nowrap">Ticket ID</th>
              <th className="py-3 px-4 min-w-[200px]">Subject</th>
              <th className="py-3 px-4 w-28 whitespace-nowrap">Priority</th>
              <th className="py-3 px-4 w-28 whitespace-nowrap">Status</th>
              <th className="py-3 px-4 w-36 whitespace-nowrap">Assigned To</th>
              <th className="py-3 px-4 w-28 whitespace-nowrap">SLA</th>
              {showActionsColumn && (
                <th className="py-3 px-4 w-32 text-right whitespace-nowrap">Actions</th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {tickets.map((ticket) => {
              const isUnassigned = !ticket.assignedAgent || ticket.assignedAgent === 'Unassigned';
              const isTeamLeadHandled = ticket.handledBy === 'teamlead' || ticket.assignedToType === 'teamlead';
              const isResolvedOrClosed = ticket.status === 'Resolved' || ticket.status === 'Closed';
              const shortSla = formatSLAShort(ticket.slaRemaining);

              const handleWorkOnTicketClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (!isTeamLeadHandled) {
                  workOnTicket(ticket.id);
                  showToast('Ticket added to your Assigned Tickets.');
                }
                onSelectTicket(ticket);
              };

              return (
                <tr
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket)}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                >
                  {/* Ticket ID */}
                  <td className="py-3 px-4 font-mono font-semibold text-xs text-[#0284C7] group-hover:underline whitespace-nowrap">
                    {ticket.id}
                  </td>

                  {/* Subject */}
                  <td className="py-3 px-4 text-xs" title={ticket.subject}>
                    <div className="font-medium text-slate-900 line-clamp-1">{ticket.subject}</div>
                    {ticket.category && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{ticket.category}</div>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <PriorityBadge priority={ticket.priority} size="sm" />
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusBadge status={ticket.status} size="sm" />
                  </td>

                  {/* Assigned To */}
                  <td className="py-3 px-4 font-medium whitespace-nowrap">
                    {isUnassigned ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Unassigned
                      </span>
                    ) : (
                      <span className="text-slate-800 font-semibold">{ticket.assignedAgent}</span>
                    )}
                  </td>

                  {/* SLA - Fully readable without truncation */}
                  <td className="py-3 px-4 whitespace-nowrap align-middle">
                    <span
                      className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${getSLABadgeStyle(
                        ticket.slaStatus
                      )}`}
                    >
                      <Clock className="w-3 h-3 mr-1 shrink-0" />
                      <span className="whitespace-nowrap">{shortSla}</span>
                    </span>
                  </td>

                  {/* Actions Column */}
                  {showActionsColumn && (
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {/* MY TICKETS TABLE ACTIONS: ONLY View */}
                        {isMyTable ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTicket(ticket);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-[#0284C7] hover:text-[#0369a1] hover:bg-sky-50 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        ) : isTeamTable ? (
                          /* TEAM TICKETS TABLE ACTIONS */
                          isResolvedOrClosed ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectTicket(ticket);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-[#0284C7] hover:text-[#0369a1] hover:bg-sky-50 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          ) : isUnassigned ? (
                            <button
                              type="button"
                              onClick={(e) => handleAssignClick(ticket, e)}
                              className="px-2.5 py-1 text-xs font-semibold text-[#0284C7] hover:text-[#0369a1] hover:bg-sky-50 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                              title="Assign ticket to employee"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Assign</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleAssignClick(ticket, e)}
                              className="px-2.5 py-1 text-xs font-semibold text-[#0284C7] hover:text-[#0369a1] hover:bg-sky-50 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                              title="Reassign ticket to another employee"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Reassign</span>
                            </button>
                          )
                        ) : (
                          /* FALLBACK / ASSIGNED TABLE ACTIONS */
                          <button
                            type="button"
                            onClick={handleWorkOnTicketClick}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369a1] rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs whitespace-nowrap"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Work on Ticket</span>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Internal Assign Ticket Modal fallback */}
      {internalAssignTicket && (
        <AssignTicketModal
          ticket={internalAssignTicket}
          isOpen={!!internalAssignTicket}
          onClose={() => setInternalAssignTicket(null)}
          onSuccessToast={showToast}
        />
      )}
    </div>
  );
};
