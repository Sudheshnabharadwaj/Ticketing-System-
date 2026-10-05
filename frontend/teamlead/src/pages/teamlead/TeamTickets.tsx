import React, { useState } from 'react';
import { useTickets } from '../../hooks/useTickets';
import { useAuth } from '../../hooks/useAuth';
import { TicketTable } from '../../components/tickets/TicketTable';
import { TicketFilters } from '../../components/tickets/TicketFilters';
import { TicketDetailsModal } from '../../components/tickets/TicketDetailsModal';
import { AssignTicketModal } from '../../components/tickets/AssignTicketModal';
import { Pagination } from '../../components/common/Pagination';
import { SearchBar } from '../../components/common/SearchBar';
import { EmptyState } from '../../components/common/EmptyState';
import { useOutletContext } from 'react-router-dom';
import { Ticket } from '../../types/ticket';
import { CheckCircle2 } from 'lucide-react';

export const TeamTickets: React.FC = () => {
  const { tickets, selectedTicket, setSelectedTicket } = useTickets();
  const { users } = useAuth();
  const outletContext = useOutletContext<{ globalSearch?: string }>();

  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState(outletContext?.globalSearch || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [agentFilter, setAgentFilter] = useState('All');
  const [slaFilter, setSlaFilter] = useState('All');

  // Assign Ticket Modal State
  const [assignModalTicket, setAssignModalTicket] = useState<Ticket | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const tabs = ['All', 'Open', 'Pending', 'Resolved', 'Closed', 'Escalated'];
  const agentsList = users.map((u) => u.name);

  // Filtering Logic
  const filteredTickets = tickets.filter((ticket) => {
    // Tab Filter
    if (activeTab !== 'All' && ticket.status !== activeTab) return false;

    // Status Dropdown Filter
    if (statusFilter !== 'All' && ticket.status !== statusFilter) return false;

    // Priority Filter
    if (priorityFilter !== 'All' && ticket.priority !== priorityFilter) return false;

    // Category Filter
    if (categoryFilter !== 'All' && ticket.category !== categoryFilter) return false;

    // Agent Filter
    if (agentFilter !== 'All' && ticket.assignedAgent !== agentFilter) return false;

    // SLA Filter
    if (slaFilter !== 'All' && ticket.slaStatus !== slaFilter) return false;

    // Search Query (ID, Subject, Employee, Agent)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = ticket.id.toLowerCase().includes(q);
      const matchSubject = ticket.subject.toLowerCase().includes(q);
      const matchEmployee = ticket.employee.toLowerCase().includes(q);
      const matchAgent = ticket.assignedAgent.toLowerCase().includes(q);
      if (!matchId && !matchSubject && !matchEmployee && !matchAgent) return false;
    }

    return true;
  });

  const handleResetFilters = () => {
    setActiveTab('All');
    setSearchQuery('');
    setStatusFilter('All');
    setPriorityFilter('All');
    setCategoryFilter('All');
    setAgentFilter('All');
    setSlaFilter('All');
    setCurrentPage(1);
  };

  const handleAssignSuccessToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center space-x-2 text-xs animate-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">Team Tickets Directory</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Complete register of department tickets with real-time assignment and SLA tracking.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto w-full max-w-full">
        {tabs.map((tab) => {
          const count =
            tab === 'All'
              ? tickets.length
              : tickets.filter((t) => t.status === tab).length;

          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === tab
                  ? 'border-sky-600 text-sky-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab} Tickets</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Component */}
      <div className="space-y-3">
        <SearchBar
          value={searchQuery}
          onChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          placeholder="Search by Ticket ID (e.g. TKT-1001), Subject, Employee, or Agent..."
        />

        <TicketFilters
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          agentFilter={agentFilter}
          setAgentFilter={setAgentFilter}
          slaFilter={slaFilter}
          setSlaFilter={setSlaFilter}
          agentsList={agentsList}
          onReset={handleResetFilters}
        />
      </div>

      {/* Tickets Table & Pagination */}
      {filteredTickets.length === 0 ? (
        <EmptyState
          title="No matching tickets found"
          description="Try adjusting your search criteria or resetting filters."
          action={
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-sky-600 text-white font-medium text-xs rounded-lg hover:bg-sky-700 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div>
          <TicketTable
            tickets={paginatedTickets}
            tableType="team"
            onSelectTicket={(t) => setSelectedTicket(t)}
            onAssignTicket={(t) => setAssignModalTicket(t)}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTickets.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}

      {/* Assign / Reassign Ticket Modal */}
      {assignModalTicket && (
        <AssignTicketModal
          ticket={assignModalTicket}
          isOpen={!!assignModalTicket}
          onClose={() => setAssignModalTicket(null)}
          onSuccessToast={handleAssignSuccessToast}
        />
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
};
