import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Table, type Column } from '../../components/ui/Table';
import type { Ticket, User } from '../../types';
import { AdminApiService } from '../../services/api';
import { AlertTriangle, AlertCircle, Eye, Search, CheckCircle2 } from 'lucide-react';

export const EscalatedTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const cached = AdminApiService.getCachedTickets();
    if (!cached || cached.length === 0) return [];
    return cached.filter((t) => t.status === 'Escalated' || (t as any).isEscalated);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(() => !AdminApiService.getCachedTickets() || AdminApiService.getCachedTickets()!.length === 0);
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const loadData = async (force = false) => {
    if (!AdminApiService.getCachedTickets() || AdminApiService.getCachedTickets()!.length === 0) {
      setIsLoading(true);
    }
    try {
      const ticketData = await AdminApiService.getTickets('escalated', force);
      const uniqueTickets = Array.from(new Map(ticketData.map(t => [t.id, t])).values());
      setTickets(uniqueTickets);
    } catch (e) {
      console.error('Failed to load escalated tickets data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    const handleUpdate = () => {
      void loadData(true);
    };
    window.addEventListener('ticket-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('ticket-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const tid = (t.ticketNumber || t.id || '').toLowerCase();
    const sub = (t.title || '').toLowerCase();
    const by = (t.escalatedBy || t.assignedTeamLead || '').toLowerCase();
    const to = (t.escalatedTo || t.assignedTo || '').toLowerCase();
    const rsn = (t.escalationReason || t.escalationNotes || '').toLowerCase();
    return tid.includes(q) || sub.includes(q) || by.includes(q) || to.includes(q) || rsn.includes(q);
  });

  const columns: Column<Ticket>[] = [
    {
      header: 'TICKET ID',
      cell: (row) => (
        <button
          onClick={() => navigate(`/admin/workspace/tickets/${row.id}?from=escalated`)}
          className="font-bold text-[#0284C7] text-sm hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
          title="Click to view ticket details"
        >
          {row.ticketNumber || row.id}
        </button>
      )
    },
    {
      header: 'SUBJECT',
      cell: (row) => (
        <span className="font-semibold text-slate-900 text-sm">
          {row.title}
        </span>
      )
    },
    {
      header: 'PRIORITY',
      cell: (row) => {
        const p = (row.priority || '').toLowerCase();
        if (p === 'critical' || p === 'urgent') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]">
              <AlertCircle className="w-3.5 h-3.5 text-[#E11D48]" />
              Critical
            </span>
          );
        }
        if (p === 'high') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
              High
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            {row.priority || 'Medium'}
          </span>
        );
      }
    },
    {
      header: 'ESCALATED BY',
      cell: (row) => (
        <span className="text-slate-800 text-sm">
          {row.escalatedBy || row.assignedTeamLead || 'Admin'}
        </span>
      )
    },
    {
      header: 'ESCALATED TO',
      cell: (row) => (
        <span className="text-[#0284C7] font-semibold text-sm">
          {row.escalatedTo || row.assignedTo || 'Team Lead'}
        </span>
      )
    },
    {
      header: 'REASON',
      cell: (row) => (
        <span className="italic text-slate-600 text-sm">
          {row.escalationReason || row.escalationNotes || 'Escalated ticket requiring attention'}
        </span>
      )
    },
    {
      header: 'ACTIONS',
      cell: (row) => (
        <button
          onClick={() => navigate(`/admin/workspace/tickets/${row.id}?from=escalated`)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0284C7] hover:text-[#0369a1] bg-transparent border-none p-0 cursor-pointer"
          title="View Ticket Details"
        >
          <Eye className="w-4 h-4 text-[#0284C7]" />
          View
        </button>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div className="flex items-center justify-between p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search Bar matching screenshot */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search escalations by Ticket ID, subject, escalated by, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Main Escalation Table */}
      <Card bodyClassName="p-0">
        <Table
          columns={columns}
          data={filteredTickets}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
        />
      </Card>
    </div>
  );
};

export default EscalatedTicketsPage;
