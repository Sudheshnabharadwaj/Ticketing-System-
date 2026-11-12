import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Ticket, TicketStatus, TicketPriority, TicketCategory } from '../types/ticket';
import { Escalation } from '../types/escalation';
import { NotificationItem } from '../types/notification';
import { ticketService } from '../services/ticketService';
import { teamLeadService } from '../services/teamLeadService';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabaseClient';

interface CreateTicketInput {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  department?: string;
  departments?: string[];
  taggedMembers?: { id: string; name: string; department: string; avatar?: string }[];
  taggedMemberIds?: string[];
  teamLeads?: any[];
  teamLeadIds?: string[];
  taggedEmployees?: any[];
  taggedEmployeeIds?: string[];
  employeeIds?: string[];
  assignedAgent?: string;
  assignedAgentId?: string;
  assignedToType?: 'teamlead' | 'employee' | 'unassigned';
  handledBy?: 'teamlead' | 'employee' | 'unassigned';
  attachments?: { name: string; size: string }[];
  rawFiles?: File[];
  [key: string]: any;
}

interface TicketContextType {
  tickets: Ticket[];
  escalations: Escalation[];
  notifications: NotificationItem[];
  selectedTicket: Ticket | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setSelectedTicket: (ticket: Ticket | null) => void;
  createTicket: (data: CreateTicketInput) => Promise<Ticket>;
  workOnTicket: (ticketId: string) => Promise<void>;
  updateStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  assignAgent: (ticketId: string, agentId: string, agentName: string, priority?: TicketPriority) => Promise<void>;
  changePriority: (ticketId: string, priority: TicketPriority) => Promise<void>;
  addComment: (ticketId: string, authorName: string, authorRole: 'teamlead' | 'employee' | 'agent' | 'admin', message: string, isInternal?: boolean) => Promise<void>;
  escalateTicket: (ticketId: string, reason: string, escalatedBy: string) => Promise<void>;
  resolveTicket: (ticketId: string, resolutionSummary?: string) => Promise<void>;
  addAttachment: (ticketId: string, attachment: { name: string; size: string }) => void;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

export const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || '';

  const [tickets, setTickets] = useState<Ticket[]>(() => ticketService.getCachedTickets() || []);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !ticketService.getCachedTickets() || ticketService.getCachedTickets()!.length === 0
  );
  const [error, setError] = useState<string | null>(null);

  const currentUserName = user?.name || 'Team Lead';
  const currentUserId = user?.id || '';
  const currentUserEmail = user?.email || '';

  const loadNotifications = useCallback(async () => {
    const notifs = await teamLeadService.getNotifications();
    setNotifications(notifs || []);
  }, []);

  const loadEscalations = useCallback(async () => {
    const loaded = await teamLeadService.getEscalations();
    setEscalations(loaded || []);
  }, []);

  const refresh = useCallback(async (silent = false, force = true) => {
    const hasCache = !!ticketService.getCachedTickets() && ticketService.getCachedTickets()!.length > 0;
    if (!silent && !hasCache) {
      setIsLoading(true);
    }
    if (force) {
      ticketService.invalidateCache();
    }
    const result = await ticketService.getTicketsDetailed(force);
    if (result.error) {
      setError(result.error);
      if (!silent && !hasCache) {
        setTickets([]);
        setEscalations([]);
      }
    } else {
      setError(null);
      setTickets(result.tickets);
      const loaded = await teamLeadService.getEscalations(result.tickets);
      setEscalations(loaded || []);
    }
    await loadNotifications();
    setIsLoading(false);
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) {
      // Signed out / auth still restoring: clear cached cross-account data.
      setTickets([]);
      setEscalations([]);
      setNotifications([]);
      setSelectedTicket(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    void refresh(false);

    // 1. Supabase Realtime Channel
    const channel = supabase
      .channel(`teamlead-realtime-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        ticketService.invalidateCache();
        void refresh(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_activities' }, () => {
        ticketService.invalidateCache();
        void refresh(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_comments' }, () => {
        ticketService.invalidateCache();
        void refresh(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portal_notifications' }, () => {
        void loadNotifications();
      })
      .subscribe();

    // 2. Controlled Polling Fallback (8 seconds, non-destructive background sync)
    const pollInterval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refresh(true);
      }
    }, 8000);

    // 3. Local/Cross-tab update listener
    const handleTicketUpdated = () => {
      void refresh(true);
    };
    window.addEventListener('ticket-updated', handleTicketUpdated);
    window.addEventListener('storage', handleTicketUpdated);

    return () => {
      window.clearInterval(pollInterval);
      window.removeEventListener('ticket-updated', handleTicketUpdated);
      window.removeEventListener('storage', handleTicketUpdated);
      try {
        supabase.removeChannel(channel);
      } catch {
        // channel unsubscribe fallback
      }
    };
  }, [userId, refresh]);

  const mergeTicket = useCallback((updated: Ticket) => {
    setTickets((prev) => {
      const exists = prev.some((t) => t.id === updated.id);
      return exists ? prev.map((t) => (t.id === updated.id ? updated : t)) : [updated, ...prev];
    });
    setSelectedTicket((prev) => (prev && prev.id === updated.id ? updated : prev));
  }, []);

  const refreshTicketDetail = useCallback(async (ticketId: string) => {
    const fresh = await ticketService.getTicketById(ticketId);
    if (fresh) mergeTicket(fresh);
  }, [mergeTicket]);

  const setErrorFrom = useCallback((message: string) => setError(message), []);

  const createTicket = useCallback(async (data: CreateTicketInput): Promise<Ticket> => {
    const firstEmp = data.taggedEmployees?.[0];
    const firstLead = data.teamLeads?.[0];
    const initialAgentName =
      data.assignedAgent ||
      firstEmp?.name ||
      firstLead?.name ||
      'Unassigned';
    const initialAgentId =
      data.assignedAgentId ||
      firstEmp?.id ||
      firstLead?.id ||
      undefined;
    const assignedToType =
      data.assignedToType ||
      (firstEmp ? 'employee' : firstLead ? 'teamlead' : 'unassigned');

    const created = await ticketService.createTicket(
      {
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
        department:
          data.departments && data.departments.length > 0
            ? data.departments.join(', ')
            : data.department,
        departments: data.departments,
        employee: currentUserName,
        employeeId: currentUserId || undefined,
        employeeEmail: currentUserEmail || undefined,
        assignedAgent: initialAgentName,
        assignedAgentId: initialAgentId,
        assignedToType: assignedToType as any,
        assignedBy: `${currentUserName} (Creator)`,
        status: 'Open',
        taggedMembers: data.taggedMembers,
        taggedMemberIds: data.taggedMemberIds,
        teamLeads: data.teamLeads,
        teamLeadIds: data.teamLeadIds,
        taggedEmployees: data.taggedEmployees,
        employeeIds: data.employeeIds,
      } as any,
      data.rawFiles,
    );

    setTickets((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
    setError(null);
    await Promise.all([loadEscalations(), loadNotifications()]);
    return created;
  }, [currentUserEmail, currentUserId, currentUserName, loadEscalations, loadNotifications]);

  const workOnTicket = useCallback(async (ticketId: string) => {
    const name = currentUserName;
    const ok = await ticketService.assignAgent(
      ticketId,
      name,
      `${name} (Team Lead)`,
      currentUserId || undefined,
      'teamlead',
      'teamlead',
    );
    if (!ok) {
      setErrorFrom('Could not assign the ticket to you. Please try again.');
      return;
    }
    const statusOk = await ticketService.updateTicketStatus(ticketId, 'In Progress');
    if (!statusOk) {
      setErrorFrom('Could not update the ticket status. Please try again.');
    }
    await refreshTicketDetail(ticketId);
    await loadEscalations();
  }, [currentUserId, currentUserName, loadEscalations, refreshTicketDetail, setErrorFrom]);

  const updateStatus = useCallback(async (ticketId: string, status: TicketStatus) => {
    const ok = await ticketService.updateTicketStatus(ticketId, status);
    if (!ok) {
      setErrorFrom('Could not change the ticket status. Please try again.');
      return;
    }
    await refreshTicketDetail(ticketId);
    await Promise.all([loadEscalations(), loadNotifications()]);
  }, [loadEscalations, loadNotifications, refreshTicketDetail, setErrorFrom]);

  const assignAgent = useCallback(async (ticketId: string, agentId: string, agentName: string, priority?: TicketPriority) => {
    const isUnassign = !agentName || agentName === 'Unassigned';
    const isTeamLead = !isUnassign && (agentId === currentUserId || agentName.toLowerCase() === currentUserName.toLowerCase());
    const ok = await ticketService.assignAgent(
      ticketId,
      isUnassign ? 'Unassigned' : agentName,
      `${currentUserName} (Team Lead)`,
      isUnassign ? undefined : agentId,
      isUnassign ? 'unassigned' : (isTeamLead ? 'teamlead' : 'employee'),
      isUnassign ? 'unassigned' : (isTeamLead ? 'teamlead' : 'employee'),
      priority,
    );
    if (!ok) {
      setErrorFrom('Could not assign the ticket. Please try again.');
      throw new Error('Could not assign the ticket. Please try again.');
    }
    ticketService.invalidateCache();
    await refresh(true, true);
    await refreshTicketDetail(ticketId);
    await loadEscalations();
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ticket_refresh_event', String(Date.now()));
        localStorage.setItem('itsm_tickets_version', String(Date.now()));
      } catch {}
      window.dispatchEvent(new CustomEvent('ticket-updated', { detail: { id: ticketId } }));
      window.dispatchEvent(new Event('storage'));
    }
  }, [currentUserId, currentUserName, loadEscalations, refresh, refreshTicketDetail, setErrorFrom]);

  const changePriority = useCallback(async (ticketId: string, priority: TicketPriority) => {
    const ok = await ticketService.changePriority(ticketId, priority);
    if (!ok) {
      setErrorFrom('Could not change the ticket priority. Please try again.');
      throw new Error('Could not change the ticket priority. Please try again.');
    }
    ticketService.invalidateCache();
    await refresh(true, true);
    await refreshTicketDetail(ticketId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ticket_refresh_event', String(Date.now()));
        localStorage.setItem('itsm_tickets_version', String(Date.now()));
      } catch {}
      window.dispatchEvent(new CustomEvent('ticket-updated', { detail: { id: ticketId } }));
      window.dispatchEvent(new Event('storage'));
    }
  }, [refresh, refreshTicketDetail, setErrorFrom]);

  const addComment = useCallback(async (
    ticketId: string,
    _authorName: string,
    _authorRole: 'teamlead' | 'employee' | 'agent' | 'admin',
    message: string,
    isInternal: boolean = false,
  ) => {
    const ok = await ticketService.addComment(ticketId, _authorName, _authorRole, message, isInternal);
    if (!ok) {
      setErrorFrom('Could not post the comment. Please try again.');
      return;
    }
    await refreshTicketDetail(ticketId);
  }, [refreshTicketDetail, setErrorFrom]);

  const escalateTicket = useCallback(async (ticketId: string, reason: string, _escalatedBy: string) => {
    const ok = await ticketService.escalateTicket(ticketId, reason, _escalatedBy);
    if (!ok) {
      setErrorFrom('Could not escalate the ticket. Please try again.');
      return;
    }
    await refreshTicketDetail(ticketId);
    await Promise.all([loadEscalations(), loadNotifications()]);
  }, [loadEscalations, loadNotifications, refreshTicketDetail, setErrorFrom]);

  const resolveTicket = useCallback(async (ticketId: string, resolutionSummary?: string) => {
    const ok = await ticketService.resolveTicket(ticketId, resolutionSummary);
    if (!ok) {
      setErrorFrom('Could not resolve the ticket. Please try again.');
      return;
    }
    await refreshTicketDetail(ticketId);
    await Promise.all([loadEscalations(), loadNotifications()]);
  }, [loadEscalations, loadNotifications, refreshTicketDetail, setErrorFrom]);

  /**
   * Attachments must be uploaded as bytes through the authenticated multipart
   * endpoint. This metadata-only helper is retained for interface compatibility
   * but never invents an attachment row.
   */
  const addAttachment = useCallback((_ticketId: string, _attachment: { name: string; size: string }) => {
    console.warn('addAttachment is deprecated; use ticketService.uploadAttachments.');
  }, []);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
    const ok = await teamLeadService.markNotificationRead(notificationId);
    if (!ok) {
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: false } : n)));
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const ok = await teamLeadService.markAllNotificationsRead();
    if (!ok) {
      setNotifications(previous);
    }
  }, [notifications]);

  const contextValue = useMemo<TicketContextType>(
    () => ({
      tickets,
      escalations,
      notifications,
      selectedTicket,
      isLoading,
      error,
      refresh,
      setSelectedTicket,
      createTicket,
      workOnTicket,
      updateStatus,
      assignAgent,
      changePriority,
      addComment,
      escalateTicket,
      resolveTicket,
      addAttachment,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      tickets,
      escalations,
      notifications,
      selectedTicket,
      isLoading,
      error,
      refresh,
      createTicket,
      workOnTicket,
      updateStatus,
      assignAgent,
      changePriority,
      addComment,
      escalateTicket,
      resolveTicket,
      addAttachment,
      markNotificationRead,
      markAllNotificationsRead,
    ],
  );

  return <TicketContext.Provider value={contextValue}>{children}</TicketContext.Provider>;
};
