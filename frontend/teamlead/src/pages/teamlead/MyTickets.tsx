import React, { useState } from 'react';
import { useTickets } from '../../hooks/useTickets';
import { useAuth } from '../../hooks/useAuth';
import { TicketTable } from '../../components/tickets/TicketTable';
import { TicketDetailsModal } from '../../components/tickets/TicketDetailsModal';
import { AssignTicketModal } from '../../components/tickets/AssignTicketModal';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { UserCheck, CheckCircle2 } from 'lucide-react';
import { Ticket } from '../../types/ticket';

export const MyTickets: React.FC = () => {
  const { tickets, selectedTicket, setSelectedTicket } = useTickets();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const [assignModalTicket, setAssignModalTicket] = useState<Ticket | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const myTickets = tickets.filter(
    (t) => t.employeeId === user.id || t.assignedAgent === user.name
  );

  const filtered = myTickets.filter(
    (t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 w-full max-w-full min-w-0">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">My Tickets</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tickets assigned to you or requiring your personal team lead intervention.
          </p>
        </div>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search my tickets by ID, subject, or category..."
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No personal tickets"
          description="You currently have no tickets assigned directly to your name."
          icon={<UserCheck className="w-8 h-8 text-sky-600" />}
        />
      ) : (
        <TicketTable
          tickets={filtered}
          tableType="my"
          onSelectTicket={(t) => setSelectedTicket(t)}
          onAssignTicket={(t) => setAssignModalTicket(t)}
        />
      )}

      {/* Assign Ticket Modal */}
      {assignModalTicket && (
        <AssignTicketModal
          ticket={assignModalTicket}
          isOpen={!!assignModalTicket}
          onClose={() => setAssignModalTicket(null)}
          onSuccessToast={showToast}
        />
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <TicketDetailsModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
};
