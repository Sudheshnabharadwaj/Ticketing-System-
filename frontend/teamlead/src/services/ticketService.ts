import { Ticket, TicketStatus, TicketPriority, TicketCategory } from '../types/ticket';
import {
  API_BASE,
  apiRequest,
  apiRequestSafe,
  authenticatedFetch,
  jsonInit,
  withAccessToken,
} from './backendAuth';

export interface AttachmentRecord {
  id?: string;
  name: string;
  size: string;
  type?: string;
  url?: string;
  viewUrl?: string;
  createdAt?: string;
  uploadedBy?: string;
}

export interface AttachmentListResult {
  attachments: AttachmentRecord[];
  error: string | null;
}

function mapAttachment(raw: any): AttachmentRecord {
  return {
    id: raw?.id,
    name: raw?.name || 'attachment',
    size: raw?.size || 'N/A',
    type: raw?.mime_type || raw?.type,
    // Downloads/previews are authenticated endpoints; attach the short-lived
    // token so browser navigation works without a custom header.
    url: withAccessToken(raw?.download_url || raw?.url || ''),
    viewUrl: withAccessToken(raw?.view_url || ''),
    createdAt: raw?.created_at,
    uploadedBy: raw?.uploaded_by,
  };
}

/** Normalise the server SLA label to the badge vocabulary used by the UI. */
function mapSlaStatus(value: any): Ticket['slaStatus'] {
  const text = String(value || '').toLowerCase();
  if (text.includes('breach')) return 'Breached';
  if (text.includes('risk')) return 'At Risk';
  return 'Within SLA';
}

/** Map a backend ticket row (snake_case + server-computed SLA) to the UI model. */
export function mapTicket(row: any): Ticket {
  return {
    id: row.id,
    subject: row.subject || 'No Subject',
    description: row.description || '',
    employee: row.employee || 'Employee',
    employeeId: row.employee_id || '',
    employeeEmail: row.employee_email || '',
    department: row.department || 'IT Support',
    category: (row.category || 'Other') as TicketCategory,
    priority: (row.priority || 'Medium') as TicketPriority,
    status: (row.status || 'Open') as TicketStatus,
    assignedAgent: row.assigned_agent || 'Unassigned',
    assignedAgentId: row.assigned_agent_id || undefined,
    isUnassigned: typeof row.is_unassigned === 'boolean' ? row.is_unassigned : undefined,
    slaStatus: mapSlaStatus(row.sla_status),
    slaRemaining: row.sla_remaining || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    attachments: Array.isArray(row.attachments) ? row.attachments.map(mapAttachment) : [],
    comments: Array.isArray(row.comments)
      ? row.comments.map((c: any) => ({
          id: c.id,
          ticketId: c.ticket_id,
          authorName: c.author_name || c.author || 'User',
          authorRole: (c.author_role || 'teamlead') as any,
          message: c.message || '',
          createdAt: c.created_at,
          isInternal: !!c.is_internal,
        }))
      : [],
    activities: Array.isArray(row.activities)
      ? row.activities.map((a: any) => ({
          id: a.id,
          ticketId: a.ticket_id,
          user: a.user,
          action: a.action,
          timestamp: a.timestamp,
        }))
      : [],
    escalationReason: row.escalation_reason || undefined,
    assignedBy: row.assigned_by || '',
    assignedDate: row.assigned_date || undefined,
    resolutionSummary: row.resolution_summary || undefined,
    subCategory: row.sub_category || undefined,
    assignedToType: (row.assigned_to_type || undefined) as Ticket['assignedToType'],
    handledBy: (row.handled_by || undefined) as Ticket['handledBy'],
    departments: Array.isArray(row.departments) ? row.departments : undefined,
  };
}

export interface TicketListResult {
  tickets: Ticket[];
  error: string | null;
}

let _ticketsInflight: Promise<TicketListResult> | null = null;
let _ticketsCache: Ticket[] | null = null;
let _lastTicketsTime = 0;
const TICKETS_CACHE_TTL = 30000;

export function invalidateTeamLeadTicketsCache(): void {
  _ticketsCache = null;
  _lastTicketsTime = 0;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ticket-updated'));
    window.dispatchEvent(new Event('storage'));
  }
}

export const ticketService = {
  invalidateCache(): void {
    invalidateTeamLeadTicketsCache();
  },

  getCachedTickets(): Ticket[] | null {
    return _ticketsCache;
  },

  /** Fetch the caller's scoped tickets, surfacing API failures to the caller. */
  getTicketsDetailed: async (force = false): Promise<TicketListResult> => {
    const now = Date.now();
    if (!force && _ticketsCache && now - _lastTicketsTime < TICKETS_CACHE_TTL) {
      return { tickets: _ticketsCache, error: null };
    }
    if (_ticketsInflight) {
      return _ticketsInflight;
    }
    _ticketsInflight = (async () => {
      try {
        const result = await apiRequestSafe<any[]>('/tickets');
        if (result.error || !Array.isArray(result.data)) {
          return {
            tickets: _ticketsCache || [],
            error: result.error || 'The server returned an invalid ticket list.',
          };
        }
        const mapped = result.data.map(mapTicket);
        _ticketsCache = mapped;
        _lastTicketsTime = Date.now();
        return { tickets: mapped, error: null };
      } finally {
        _ticketsInflight = null;
      }
    })();
    return _ticketsInflight;
  },

  getTickets: async (force = false): Promise<Ticket[]> => {
    const result = await ticketService.getTicketsDetailed(force);
    if (result.error) console.warn('Could not load tickets:', result.error);
    return result.tickets;
  },

  getTicketById: async (id: string): Promise<Ticket | undefined> => {
    try {
      const data = await apiRequest<any>(`/tickets/${encodeURIComponent(id)}`);
      const ticket = mapTicket(data);
      if (!ticket.attachments || ticket.attachments.length === 0) {
        const attachments = await ticketService.getAttachmentsDetailed(id);
        if (attachments.attachments.length > 0) {
          ticket.attachments = attachments.attachments;
        }
      }
      return ticket;
    } catch (e) {
      console.warn('Error in getTicketById:', e);
      return undefined;
    }
  },

  getAttachmentsDetailed: async (ticketId: string): Promise<AttachmentListResult> => {
    const result = await apiRequestSafe<any[]>(
      `/tickets/${encodeURIComponent(ticketId)}/attachments`,
    );
    if (result.error || !Array.isArray(result.data)) {
      return {
        attachments: [],
        error: result.error || 'Could not load attachments from the server.',
      };
    }
    return { attachments: result.data.map(mapAttachment), error: null };
  },

  getAttachments: async (ticketId: string): Promise<AttachmentRecord[]> => {
    const result = await ticketService.getAttachmentsDetailed(ticketId);
    return result.attachments;
  },

  uploadAttachments: async (ticketId: string, files: File[]): Promise<boolean> => {
    if (!files || files.length === 0) return true;
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      const res = await authenticatedFetch(
        `${API_BASE}/tickets/${encodeURIComponent(ticketId)}/attachments`,
        { method: 'POST', body: form },
      );
      return res.ok;
    } catch (e) {
      console.warn('Error uploading attachments:', e);
      return false;
    }
  },

  createTicket: async (newTicketData: Partial<Ticket>, rawFiles?: File[]): Promise<Ticket> => {
    const departments =
      newTicketData.departments && newTicketData.departments.length > 0
        ? newTicketData.departments
        : undefined;

    const payload = {
      subject: newTicketData.subject || 'No Subject',
      description: newTicketData.description || '',
      category: newTicketData.category || 'Other',
      priority: newTicketData.priority || 'Medium',
      department: newTicketData.department || (departments ? departments.join(', ') : undefined),
      departments,
      employee: newTicketData.employee || undefined,
      employee_id: newTicketData.employeeId || undefined,
      employee_email: newTicketData.employeeEmail || undefined,
      assigned_agent: newTicketData.assignedAgent || undefined,
      assigned_agent_id: newTicketData.assignedAgentId || undefined,
      assigned_to_type: newTicketData.assignedToType || undefined,
      assigned_by: newTicketData.assignedBy || undefined,
      status: newTicketData.status || 'Open',
      team_lead_ids: (newTicketData as any).teamLeadIds || (newTicketData as any).team_lead_ids,
      team_leads: (newTicketData as any).teamLeads || (newTicketData as any).team_leads,
      tagged_employee_ids: (newTicketData as any).employeeIds || (newTicketData as any).tagged_employee_ids,
      employees: (newTicketData as any).taggedEmployees || (newTicketData as any).employees,
    };

    const created = await apiRequest<any>('/tickets', jsonInit('POST', payload));
    const ticket = mapTicket(created);

    if (rawFiles && rawFiles.length > 0) {
      const uploaded = await ticketService.uploadAttachments(ticket.id, rawFiles);
      if (!uploaded) {
        console.error('Attachment upload failed for', ticket.id);
      } else {
        ticket.attachments = await ticketService.getAttachments(ticket.id);
      }
    }
    invalidateTeamLeadTicketsCache();
    return ticket;
  },

  updateTicketStatus: async (id: string, status: TicketStatus): Promise<boolean> => {
    try {
      await apiRequest(`/tickets/${encodeURIComponent(id)}/status`, jsonInit('POST', { status }));
      invalidateTeamLeadTicketsCache();
      return true;
    } catch (e) {
      console.warn('Error updating ticket status:', e);
      return false;
    }
  },

  assignAgent: async (
    id: string,
    agentName: string,
    assignedBy?: string,
    agentId?: string,
    assignedToType?: string,
    handledBy?: string,
    priority?: string,
  ): Promise<boolean> => {
    try {
      await apiRequest(
        `/tickets/${encodeURIComponent(id)}/assign`,
        jsonInit('POST', {
          assigned_agent: agentName,
          assigned_agent_id: agentId || undefined,
          assigned_by: assignedBy || undefined,
          assigned_to_type: assignedToType || undefined,
          handled_by: handledBy || undefined,
          priority: priority || undefined,
        }),
      );
      invalidateTeamLeadTicketsCache();
      return true;
    } catch (e) {
      console.warn('Error assigning ticket:', e);
      return false;
    }
  },

  changePriority: async (id: string, priority: TicketPriority): Promise<boolean> => {
    try {
      await apiRequest(
        `/tickets/${encodeURIComponent(id)}`,
        jsonInit('PATCH', { priority }),
      );
      invalidateTeamLeadTicketsCache();
      return true;
    } catch (e) {
      console.warn('Error changing priority:', e);
      return false;
    }
  },

  resolveTicket: async (id: string, resolutionSummary?: string): Promise<boolean> => {
    try {
      await apiRequest(
        `/tickets/${encodeURIComponent(id)}/resolve`,
        jsonInit('POST', { resolution_summary: resolutionSummary || 'Resolved by team lead.' }),
      );
      invalidateTeamLeadTicketsCache();
      return true;
    } catch (e) {
      console.warn('Error resolving ticket:', e);
      return false;
    }
  },

  addComment: async (
    ticketId: string,
    _authorName: string,
    _authorRole: string,
    message: string,
    isInternal: boolean = false,
  ): Promise<boolean> => {
    try {
      // Author identity is taken from the token server-side, never from the UI.
      await apiRequest(
        `/tickets/${encodeURIComponent(ticketId)}/comments`,
        jsonInit('POST', { message, is_internal: isInternal }),
      );
      invalidateTeamLeadTicketsCache();
      return true;
    } catch (e) {
      console.warn('Error adding comment:', e);
      return false;
    }
  },

  escalateTicket: async (
    ticketId: string,
    reason: string,
    _escalatedBy: string,
    _subject?: string,
    _priority?: TicketPriority,
  ): Promise<boolean> => {
    try {
      await apiRequest(
        `/tickets/${encodeURIComponent(ticketId)}/escalate`,
        jsonInit('POST', { reason, escalated_to: _escalatedBy }),
      );
      invalidateTeamLeadTicketsCache();
      return true;
    } catch (e) {
      console.warn('Error escalating ticket:', e);
      return false;
    }
  },

  /**
   * Deprecated: attachments can no longer be registered as metadata-only rows.
   * Use ``uploadAttachments`` so the bytes are actually stored and authorized.
   */
  addAttachment: async (): Promise<boolean> => false,
};
