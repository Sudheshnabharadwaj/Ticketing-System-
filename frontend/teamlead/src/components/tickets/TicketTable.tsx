import React, { useState } from 'react';
import { Ticket } from '../../types/ticket';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { formatDate, getSLABadgeStyle, formatSLAShort } from '../../utils/helpers';
import { AssignTicketModal } from './AssignTicketModal';
import {
  Eye,
  MoreVertical,
  UserCheck,
  AlertTriangle,
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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Fallback internal Assign Ticket modal state
  const [internalAssignTicket, setInternalAssignTicket] = useState<Ticket | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleAction = (actionFn: () => void) => {
    actionFn();
    setActiveMenuId(null);
  };

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

      <div className="w-full max-w-full overflow-x-auto lg:overflow-x-visible">
        <table className="w-full text-left border-collapse table-fixed max-w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-2 px-3 w-[9%]">Ticket ID</th>
              <th className={`py-2 px-3 ${isMyTable ? 'w-[32%]' : isTeamTable ? 'w-[26%]' : 'w-[24%]'}`}>Subject</th>
              <th className="py-2 px-3 w-[9%]">Priority</th>
              <th className="py-2 px-3 w-[13%]">Status</th>
              <th className="py-2 px-3 w-[14%]">Assigned To</th>
              <th className="py-2 px-3 w-[14%]">SLA</th>
              <th className={`py-2 px-3 text-right ${isMyTable ? 'w-[9%]' : isTeamTable ? 'w-[15%]' : 'w-[17%]'}`}>Actions</th>
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
                  <td className="py-2 px-3 font-mono font-semibold text-xs text-sky-600 group-hover:underline truncate min-w-0">
                    {ticket.id}
                  </td>

                  {/* Subject */}
                  <td className="py-2 px-3 font-medium text-slate-900 truncate text-xs min-w-0" title={ticket.subject}>
                    {ticket.subject}
                  </td>

                  {/* Priority */}
                  <td className="py-2 px-3 truncate min-w-0 whitespace-nowrap">
                    <PriorityBadge priority={ticket.priority} size="sm" />
                  </td>

                  {/* Status */}
                  <td className="py-2 px-3 truncate min-w-0 whitespace-nowrap">
                    <StatusBadge status={ticket.status} size="sm" />
                  </td>

                  {/* Assigned To */}
                  <td className="py-2 px-3 font-medium truncate text-xs min-w-0">
                    {isUnassigned ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                        Unassigned
                      </span>
                    ) : (
                      <span className="text-slate-800 font-semibold truncate block">{ticket.assignedAgent}</span>
                    )}
                  </td>

                  {/* SLA - Fully readable without truncation */}
                  <td className="py-2 px-3 whitespace-nowrap overflow-visible min-w-0 align-middle">
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
                    <td className="py-2 px-3 text-right relative whitespace-nowrap min-w-0" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                        {/* MY TICKETS TABLE ACTIONS: ONLY View */}
                        {isMyTable ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTicket(ticket);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
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
                              className="px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          ) : isUnassigned ? (
                            <button
                              type="button"
                              onClick={(e) => handleAssignClick(ticket, e)}
                              className="px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                              title="Assign ticket to employee"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Assign</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleAssignClick(ticket, e)}
                              className="px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
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
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs whitespace-nowrap"
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
