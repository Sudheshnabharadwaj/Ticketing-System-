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
    <div className="space-y-6 w-full max-w-full min-w-0 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900 tracking-tight leading-snug">Escalation Control Desk</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Review critical tickets escalated due to SLA breach risk, technical complexity, or management urgency.
          </p>
        </div>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search escalations by Ticket ID, subject, escalated by, or reason..."
      />

      {/* Escalations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden w-full max-w-full min-w-0">
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full min-w-[850px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-32 whitespace-nowrap">Ticket ID</th>
                <th className="py-3 px-4 min-w-[200px]">Subject</th>
                <th className="py-3 px-4 w-28 whitespace-nowrap">Priority</th>
                <th className="py-3 px-4 w-36 whitespace-nowrap">Escalated By</th>
                <th className="py-3 px-4 w-36 whitespace-nowrap">Escalated To</th>
                <th className="py-3 px-4 min-w-[180px]">Reason</th>
                <th className="py-3 px-4 w-36 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredEscalations.map((esc) => (
                <tr key={esc.id} className="hover:bg-slate-50/70 transition-colors">
                  <td
                    onClick={() => handleOpenTicket(esc.ticketId)}
                    className="py-3 px-4 font-mono font-semibold text-xs text-[#0284C7] hover:underline cursor-pointer whitespace-nowrap"
                  >
                    {esc.ticketId}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium text-slate-900" title={esc.subject}>
                    {esc.subject}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <PriorityBadge priority={esc.priority} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{esc.escalatedBy}</td>
                  <td className="py-3 px-4 font-semibold text-[#0284C7] whitespace-nowrap">{esc.escalatedTo}</td>
                  <td className="py-3 px-4 text-slate-600 italic text-xs" title={esc.escalationReason}>{esc.escalationReason}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenTicket(esc.ticketId)}
                        className="px-2.5 py-1 text-xs font-semibold text-[#0284C7] hover:text-[#0369a1] hover:bg-sky-50 rounded transition-colors flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button
                        onClick={() => resolveTicket(esc.ticketId)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
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
