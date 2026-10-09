import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useTickets } from '../../hooks/useTickets';
import { useAuth } from '../../hooks/useAuth';
import { AssignTicketModal } from '../../components/tickets/AssignTicketModal';
import { SearchBar } from '../../components/common/SearchBar';
import { TicketFilters } from '../../components/tickets/TicketFilters';
import { Pagination } from '../../components/common/Pagination';
import { EmptyState } from '../../components/common/EmptyState';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDate, getSLABadgeStyle, formatSLAShort } from '../../utils/helpers';
import { Ticket } from '../../types/ticket';
import { UserCheck, Clock, Eye, CheckCircle2 } from 'lucide-react';

export const AssignedTickets: React.FC = () => {
  const { tickets } = useTickets();
  const { users } = useAuth();
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ globalSearch?: string }>();

  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState(outletContext?.globalSearch || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [agentFilter, setAgentFilter] = useState('All');
  const [slaFilter, setSlaFilter] = useState('All');

  const [assignModalTicket, setAssignModalTicket] = useState<Ticket | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter ONLY tickets that are personally assigned to Team Lead
  const assignedTickets = tickets.filter(
    (t) =>
      (t.assignedAgent && user.name && t.assignedAgent.toLowerCase() === user.name.toLowerCase()) ||
      (t.assignedAgentId && user.id && t.assignedAgentId === user.id) ||
      t.handledBy === 'teamlead' ||
      t.assignedToType === 'teamlead'
  );

  const agentsList = users.map((u) => u.name);

  // Filter logic
  const filteredTickets = assignedTickets.filter((ticket) => {
    if (activeTab !== 'All' && ticket.status !== activeTab) return false;
    if (statusFilter !== 'All' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'All' && ticket.priority !== priorityFilter) return false;
    if (categoryFilter !== 'All' && ticket.category !== categoryFilter) return false;
    if (agentFilter !== 'All' && ticket.assignedAgent !== agentFilter) return false;
    if (slaFilter !== 'All' && ticket.slaStatus !== slaFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = ticket.id.toLowerCase().includes(q);
      const matchSubject = ticket.subject.toLowerCase().includes(q);
      const matchDept = (ticket.department || '').toLowerCase().includes(q);
      if (!matchId && !matchSubject && !matchDept) return false;
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

  const tabs = ['All', 'Open', 'Pending', 'Resolved', 'Closed', 'Escalated'];
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-5 w-full max-w-full min-w-0">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">Assigned Tickets</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Tickets personally owned and assigned to you for Team Lead resolution.
        </p>
      </div>

      {/* Status Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto w-full max-w-full">
        {tabs.map((tab) => {
          const count =
            tab === 'All'
              ? assignedTickets.length
              : assignedTickets.filter((t) => t.status === tab).length;

          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === tab
                  ? 'border-sky-600 text-sky-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab} Tickets</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab ? 'bg-sky-100 text-sky-700 font-bold' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <SearchBar
          value={searchQuery}
          onChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          placeholder="Search assigned tickets by ID, subject, or department..."
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

      {/* Table */}
      {filteredTickets.length === 0 ? (
        <EmptyState
          title="No assigned tickets found"
          description="There are no tickets assigned to you personally matching your criteria."
          icon={<UserCheck className="w-8 h-8 text-sky-600" />}
          action={
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-sky-600 text-white font-semibold text-xs rounded-lg hover:bg-sky-700 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden w-full max-w-full min-w-0">
            <div className="w-full max-w-full overflow-x-auto lg:overflow-x-visible">
              <table className="w-full text-left border-collapse table-fixed max-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-3 w-[10%]">Ticket ID</th>
                    <th className="py-2 px-3 w-[29%]">Subject</th>
                    <th className="py-2 px-3 w-[12%]">Department</th>
                    <th className="py-2 px-3 w-[10%]">Priority</th>
                    <th className="py-2 px-3 w-[13%]">Status</th>
                    <th className="py-2 px-3 w-[11%]">SLA</th>
                    <th className="py-2 px-3 w-[15%] text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {paginatedTickets.map((ticket) => {
                    const shortSla = formatSLAShort(ticket.slaRemaining);

                    return (
                      <tr
                        key={ticket.id}
                        onClick={() => navigate(`/teamlead/assigned-tickets/${ticket.id}`)}
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

                        {/* Department */}
                        <td className="py-2 px-3 text-xs font-medium text-slate-700 truncate min-w-0">
                          {ticket.department || 'IT Support'}
                        </td>

                        {/* Priority */}
                        <td className="py-2 px-3 truncate min-w-0 whitespace-nowrap">
                          <PriorityBadge priority={ticket.priority} size="sm" />
                        </td>

                        {/* Status */}
                        <td className="py-2 px-3 truncate min-w-0 whitespace-nowrap">
                          <StatusBadge status={ticket.status} size="sm" />
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

                        {/* Actions */}
                        <td className="py-2 px-3 text-right whitespace-nowrap min-w-0" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => navigate(`/teamlead/assigned-tickets/${ticket.id}`)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs whitespace-nowrap"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Work on Ticket</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTickets.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}

      {/* Assign / Reassign Modal */}
      {assignModalTicket && (
        <AssignTicketModal
          ticket={assignModalTicket}
          isOpen={!!assignModalTicket}
          onClose={() => setAssignModalTicket(null)}
          onSuccessToast={showToast}
        />
      )}
    </div>
  );
};
