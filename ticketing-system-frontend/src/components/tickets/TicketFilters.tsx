import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { CATEGORIES, PRIORITIES, STATUSES } from '../../utils/constants';

interface TicketFiltersProps {
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  agentFilter?: string;
  setAgentFilter?: (agent: string) => void;
  slaFilter?: string;
  setSlaFilter?: (sla: string) => void;
  agentsList?: string[];
  onReset: () => void;
}

export const TicketFilters: React.FC<TicketFiltersProps> = ({
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  categoryFilter,
  setCategoryFilter,
  agentFilter,
  setAgentFilter,
  slaFilter,
  setSlaFilter,
  agentsList = [],
  onReset,
}) => {
  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs mb-3 w-full max-w-full min-w-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2 text-slate-800 font-semibold text-xs uppercase tracking-wider">
          <Filter className="w-4 h-4 text-sky-600" />
          <span>Filter Tickets</span>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-medium text-slate-500 hover:text-sky-600 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Filters
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full max-w-full min-w-0">
        {/* Status Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
          >
            <option value="All">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Priority</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
          >
            <option value="All">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Employee Filter */}
        {setAgentFilter && (
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Assigned Employee</label>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
            >
              <option value="All">All Employees</option>
              {agentsList.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* SLA Filter */}
        {setSlaFilter && (
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">SLA Status</label>
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value)}
              className="w-full min-w-[130px] px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white cursor-pointer"
            >
              <option value="All">All SLA Statuses</option>
              <option value="Within SLA">Within SLA</option>
              <option value="At Risk">At Risk</option>
              <option value="Overdue">Overdue</option>
              <option value="Breached">Breached</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
