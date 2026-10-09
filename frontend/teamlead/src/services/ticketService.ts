import { Ticket, TicketStatus, TicketPriority, TicketCategory } from '../types/ticket';
import { supabase } from './supabaseClient';

export const ticketService = {
  getTickets: async (): Promise<Ticket[]> => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          subject: row.subject || 'No Subject',
          description: row.description || '',
          employee: row.employee || 'Employee',
          employeeId: row.employee_id || 'EMP001',
          employeeEmail: row.employee_email || 'employee@company.com',
          category: (row.category || 'Other') as TicketCategory,
          priority: (row.priority || 'Medium') as TicketPriority,
          status: (row.status || 'Open') as TicketStatus,
          assignedAgent: row.assigned_agent || 'Unassigned',
          assignedBy: row.assigned_by || '',
          department: row.department || 'IT Support',
          slaStatus: row.sla_status || 'Within SLA',
          slaRemaining: row.sla_remaining || '8h remaining',
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
          attachments: row.attachments || [],
          comments: [],
          activities: [],
        }));
      }
    } catch (e) {
      console.warn('Error fetching tickets from Supabase:', e);
    }
    return [];
  },

  getTicketById: async (id: string): Promise<Ticket | undefined> => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const { data: dbActivities } = await supabase
          .from('ticket_activities')
          .select('*')
          .eq('ticket_id', id)
          .order('timestamp', { ascending: false });

        const { data: dbComments } = await supabase
          .from('ticket_comments')
          .select('*')
          .eq('ticket_id', id)
          .order('created_at', { ascending: true });

        return {
          id: data.id,
          subject: data.subject || 'No Subject',
          description: data.description || '',
          employee: data.employee || 'Employee',
          employeeId: data.employee_id || 'EMP001',
          employeeEmail: data.employee_email || 'employee@company.com',
          category: (data.category || 'Other') as TicketCategory,
          priority: (data.priority || 'Medium') as TicketPriority,
          status: (data.status || 'Open') as TicketStatus,
          assignedAgent: data.assigned_agent || 'Unassigned',
          assignedBy: data.assigned_by || '',
          department: data.department || 'IT Support',
          slaStatus: data.sla_status || 'Within SLA',
          slaRemaining: data.sla_remaining || '8h remaining',
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at || new Date().toISOString(),
          attachments: data.attachments || [],
          comments: (dbComments || []).map((c: any) => ({
            id: c.id,
            ticketId: c.ticket_id,
            authorName: c.author_name,
            authorRole: c.author_role || 'teamlead',
            message: c.message,
            createdAt: c.created_at,
            isInternal: !!c.is_internal,
          })),
          activities: (dbActivities || []).map((a: any) => ({
            id: a.id,
            ticketId: a.ticket_id,
            user: a.user,
            action: a.action,
            timestamp: a.timestamp,
          })),
        };
      }
    } catch (e) {
      console.warn('Error in getTicketById:', e);
    }
    return undefined;
  },

  createTicket: async (newTicketData: Partial<Ticket>): Promise<Ticket> => {
    const newId = newTicketData.id || `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    // Ensure employee_id does not violate foreign key if user id is custom or missing
    let safeEmployeeId: string | null = newTicketData.employeeId || null;
    if (safeEmployeeId && !safeEmployeeId.startsWith('TL') && !safeEmployeeId.startsWith('EMP') && !safeEmployeeId.startsWith('usr-')) {
      safeEmployeeId = null;
    }

    const row = {
      id: newId,
      subject: newTicketData.subject || "No Subject",
      description: newTicketData.description || "",
      employee: newTicketData.employee || "Sudheshna Bharadwaj",
      employee_id: safeEmployeeId,
      employee_email: newTicketData.employeeEmail || "sudheshnabharadwaj@gmail.com",
      category: newTicketData.category || "Hardware & Devices",
      priority: newTicketData.priority || "Medium",
      status: newTicketData.status || "Open",
      department: (newTicketData.departments && newTicketData.departments.length > 0) ? newTicketData.departments.join(', ') : "IT Support",
      assigned_agent: newTicketData.assignedAgent || "Unassigned",
      sla_status: newTicketData.slaStatus || "Within SLA",
      sla_remaining: newTicketData.slaRemaining || "8h 00m remaining",
      departments: newTicketData.departments || ["IT Support"],
    };

    try {
      const { error: insErr } = await supabase.from('tickets').insert([row]);
      if (insErr) {
        console.error('Supabase create ticket error:', insErr);
      }

      // Save attachments to ticket_attachments table
      if (newTicketData.attachments && newTicketData.attachments.length > 0) {
        const attRows = newTicketData.attachments.map((att: any, idx: number) => ({
          id: `att-${Date.now()}-${idx}`,
          ticket_id: newId,
          name: typeof att === 'string' ? att : att.name,
          size: typeof att === 'object' && att.size ? String(att.size) : 'N/A',
          url: '',
        }));
        await supabase.from('ticket_attachments').insert(attRows);
      }

      supabase.from('ticket_activities').insert([{
        id: `act-${Date.now()}`,
        ticket_id: newId,
        user: row.employee,
        action: "Ticket created",
        timestamp: now
      }]).then(() => {});
    } catch (e) {
      console.warn('Supabase create ticket error:', e);
    }

    return {
      id: newId,
      subject: row.subject,
      description: row.description,
      employee: row.employee,
      employeeId: row.employee_id || 'TL001',
      employeeEmail: row.employee_email,
      category: (row.category as TicketCategory) || "Other",
      priority: (row.priority as TicketPriority) || "Medium",
      status: (row.status as TicketStatus) || "Open",
      assignedAgent: row.assigned_agent,
      slaStatus: row.sla_status,
      slaRemaining: row.sla_remaining,
      createdAt: now,
      updatedAt: now,
      attachments: newTicketData.attachments || [],
      comments: [],
      activities: [{
        id: `act-${Date.now()}`,
        ticketId: newId,
        user: row.employee,
        action: "Ticket created",
        timestamp: now,
      }],
    };
  },

  updateTicketStatus: async (id: string, status: TicketStatus): Promise<boolean> => {
    try {
      const { error } = await supabase.from('tickets').update({ status }).eq('id', id);
      if (error) console.error('Error updating status in Supabase:', error);
      return !error;
    } catch {
      return false;
    }
  },

  assignAgent: async (id: string, agentName: string, assignedBy?: string): Promise<boolean> => {
    try {
      const updates: Record<string, any> = { assigned_agent: agentName };
      if (assignedBy) updates.assigned_by = assignedBy;
      const { error } = await supabase.from('tickets').update(updates).eq('id', id);
      if (error) console.error('Error assigning agent in Supabase:', error);
      return !error;
    } catch {
      return false;
    }
  },

  changePriority: async (id: string, priority: TicketPriority): Promise<boolean> => {
    try {
      const { error } = await supabase.from('tickets').update({ priority }).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  resolveTicket: async (id: string, resolutionSummary?: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('tickets').update({
        status: 'Resolved',
        resolution_summary: resolutionSummary || 'Resolved by team lead.',
      }).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  addComment: async (ticketId: string, authorName: string, authorRole: string, message: string, isInternal: boolean = false): Promise<boolean> => {
    try {
      await supabase.from('ticket_comments').insert([{
        id: `comm-${Date.now()}`,
        ticket_id: ticketId,
        author_name: authorName,
        author_role: authorRole,
        message,
        is_internal: isInternal,
        created_at: new Date().toISOString(),
      }]);
      await supabase.from('ticket_activities').insert([{
        id: `act-${Date.now()}`,
        ticket_id: ticketId,
        user: authorName,
        action: isInternal ? 'Added internal note' : 'Added reply',
        timestamp: new Date().toISOString(),
      }]);
      return true;
    } catch {
      return false;
    }
  },

  escalateTicket: async (ticketId: string, reason: string, escalatedBy: string, subject?: string, priority?: TicketPriority): Promise<boolean> => {
    try {
      await supabase.from('tickets').update({
        status: 'Escalated',
        escalation_reason: reason,
      }).eq('id', ticketId);

      await supabase.from('escalations').insert([{
        id: `ESC-${Date.now()}`,
        ticket_id: ticketId,
        subject: subject || `Escalated Ticket ${ticketId}`,
        priority: priority || 'High',
        escalated_by: escalatedBy,
        escalated_to: 'Tier 3 Operations',
        escalation_reason: reason,
        sla_status: 'Breached SLA',
        escalated_date: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'Pending Review',
      }]);

      await supabase.from('ticket_activities').insert([{
        id: `act-${Date.now()}`,
        ticket_id: ticketId,
        user: escalatedBy,
        action: `Escalated ticket: ${reason}`,
        timestamp: new Date().toISOString(),
      }]);
      return true;
    } catch {
      return false;
    }
  }
};
