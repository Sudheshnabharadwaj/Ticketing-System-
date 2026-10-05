import { Ticket, TicketStatus, TicketPriority, TicketCategory } from '../types/ticket';
import { mockTickets } from '../mock/tickets';

// Simulating future REST API endpoints
export const ticketService = {
  getTickets: async (): Promise<Ticket[]> => {
    return new Promise((resolve) => setTimeout(() => resolve([...mockTickets]), 150));
  },

  getTicketById: async (id: string): Promise<Ticket | undefined> => {
    return new Promise((resolve) => {
      const ticket = mockTickets.find((t) => t.id === id);
      setTimeout(() => resolve(ticket), 150);
    });
  },

  createTicket: async (newTicketData: Partial<Ticket>): Promise<Ticket> => {
    return new Promise((resolve) => {
      const newId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();
      const ticket: Ticket = {
        id: newId,
        subject: newTicketData.subject || "No Subject",
        description: newTicketData.description || "",
        employee: newTicketData.employee || "Rahul Sharma",
        employeeId: newTicketData.employeeId || "EMP001",
        employeeEmail: newTicketData.employeeEmail || "employee@ticketing.com",
        category: (newTicketData.category as TicketCategory) || "Other",
        priority: (newTicketData.priority as TicketPriority) || "Medium",
        status: "Open",
        assignedAgent: "Unassigned",
        slaStatus: "Within SLA",
        slaRemaining: "8h 00m remaining",
        createdAt: now,
        updatedAt: now,
        attachments: newTicketData.attachments || [],
        comments: [],
        activities: [
          {
            id: `act-${Date.now()}`,
            ticketId: newId,
            user: newTicketData.employee || "Rahul Sharma",
            action: "Ticket created",
            timestamp: now,
          },
        ],
      };
      setTimeout(() => resolve(ticket), 200);
    });
  },

  updateTicketStatus: async (id: string, status: TicketStatus): Promise<boolean> => {
    return new Promise((resolve) => setTimeout(() => resolve(true), 150));
  },

  assignAgent: async (id: string, agentName: string): Promise<boolean> => {
    return new Promise((resolve) => setTimeout(() => resolve(true), 150));
  }
};
