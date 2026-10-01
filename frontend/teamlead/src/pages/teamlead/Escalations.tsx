import React, { useState } from 'react';
import { useTickets } from '../../hooks/useTickets';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { TicketDetailsModal } from '../../components/tickets/TicketDetailsModal';
import { SearchBar } from '../../components/common/SearchBar';
import { getSLABadgeStyle } from '../../utils/helpers';
import { AlertTriangle, ShieldAlert, Eye, UserPlus, CheckCircle2 } from 'lucide-react';
import { Ticket } from '../../types/ticket';

export const Escalations: React.FC = () => {
  const { escalations, tickets, setSelectedTicket, selectedTicket, resolveTicket, assignAgent } = useTickets();
  const [search, setSearch] = useState('');

  const filteredEscalations = escalations.filter(
    (esc) =>
      esc.ticketId.toLowerCase().includes(search.toLowerCase()) ||
      esc.subject.toLowerCase().includes(search.toLowerCase()) ||
      esc.escalatedBy.toLowerCase().includes(search.toLowerCase()) ||
      esc.escalationReason.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenTicket = (ticketId: string) => {
    const found = tickets.find((t) => t.id === ticketId);
    if (found) {
      setSelectedTicket(found);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">Escalation Control Desk</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Review critical tickets escalated due to SLA breach risk, technical complexity, or management urgency.
        </p>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search escalations by Ticket ID, subject, escalated by, or reason..."
      />

      {/* Escalations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden w-full max-w-full min-w-0">
        <div className="w-full max-w-full overflow-x-auto lg:overflow-x-visible">
          <table className="w-full text-left border-collapse table-fixed max-w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-3 w-[10%]">Ticket ID</th>
                <th className="py-2 px-3 w-[25%]">Subject</th>
                <th className="py-2 px-3 w-[10%]">Priority</th>
                <th className="py-2 px-3 w-[13%]">Escalated By</th>
                <th className="py-2 px-3 w-[13%]">Escalated To</th>
                <th className="py-2 px-3 w-[14%]">Reason</th>
                <th className="py-2 px-3 w-[15%] text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredEscalations.map((esc) => (
                <tr key={esc.id} className="hover:bg-slate-50/70 transition-colors">
                  <td
                    onClick={() => handleOpenTicket(esc.ticketId)}
                    className="py-2 px-3 font-mono font-semibold text-xs text-sky-600 hover:underline cursor-pointer truncate min-w-0"
                  >
                    {esc.ticketId}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-900 truncate min-w-0" title={esc.subject}>
                    {esc.subject}
                  </td>
                  <td className="py-2 px-3 truncate min-w-0 whitespace-nowrap">
                    <PriorityBadge priority={esc.priority} size="sm" />
                  </td>
                  <td className="py-2 px-3 text-slate-700 truncate min-w-0">{esc.escalatedBy}</td>
                  <td className="py-2 px-3 font-semibold text-sky-700 truncate min-w-0">{esc.escalatedTo}</td>
                  <td className="py-2 px-3 text-slate-600 italic truncate min-w-0" title={esc.escalationReason}>{esc.escalationReason}</td>
                  <td className="py-2 px-3 text-right whitespace-nowrap min-w-0">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenTicket(esc.ticketId)}
                        className="px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <button
                        onClick={() => resolveTicket(esc.ticketId)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Action
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTicket && (
        <TicketDetailsModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
};
