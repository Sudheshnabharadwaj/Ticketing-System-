import React, { createContext, useState } from 'react';
import { Ticket, TicketStatus, TicketPriority, TicketCategory } from '../types/ticket';
import { Escalation } from '../types/escalation';
import { NotificationItem } from '../types/notification';
import { mockTickets } from '../mock/tickets';
import { mockEscalations } from '../mock/escalations';
import { mockNotifications } from '../mock/notifications';

interface TicketContextType {
  tickets: Ticket[];
  escalations: Escalation[];
  notifications: NotificationItem[];
  selectedTicket: Ticket | null;
  setSelectedTicket: (ticket: Ticket | null) => void;
  createTicket: (data: {
    subject: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    department?: string;
    departments?: string[];
    taggedMembers?: { id: string; name: string; department: string; avatar?: string }[];
    taggedMemberIds?: string[];
    teamLeads?: { id: string; name: string; employeeId: string; role: string; email: string }[];
    teamLeadIds?: string[];
    taggedEmployees?: { id: string; name: string; employeeId: string; role: string; email: string }[];
    employeeIds?: string[];
    attachments?: { name: string; size: string }[];
  }) => Ticket;
  workOnTicket: (ticketId: string) => void;
  updateStatus: (ticketId: string, status: TicketStatus) => void;
  assignAgent: (ticketId: string, agentId: string, agentName: string) => void;
  changePriority: (ticketId: string, priority: TicketPriority) => void;
  addComment: (ticketId: string, authorName: string, authorRole: 'teamlead' | 'employee' | 'agent', message: string, isInternal?: boolean) => void;
  escalateTicket: (ticketId: string, reason: string, escalatedBy: string) => void;
  resolveTicket: (ticketId: string, resolutionSummary?: string) => void;
  addAttachment: (ticketId: string, attachment: { name: string; size: string }) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
}

export const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [escalations, setEscalations] = useState<Escalation[]>(mockEscalations);
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockNotifications);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const createTicket = (data: {
    subject: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    department?: string;
    departments?: string[];
    taggedMembers?: { id: string; name: string; department: string; avatar?: string }[];
    taggedMemberIds?: string[];
    teamLeads?: { id: string; name: string; employeeId: string; role: string; email: string }[];
    teamLeadIds?: string[];
    taggedEmployees?: { id: string; name: string; employeeId: string; role: string; email: string }[];
    employeeIds?: string[];
    attachments?: { name: string; size: string }[];
  }): Ticket => {
    const nextNum = tickets.length + 1001;
    const ticketId = `TKT-${nextNum}`;
    const now = new Date().toISOString();

    const taggedEmps = data.taggedEmployees || [];
    const assignedAgentName = taggedEmps.length > 0
      ? taggedEmps.map((e) => `${e.name} (${e.employeeId})`).join(', ')
      : "Unassigned";

    const newTicket: Ticket = {
      id: ticketId,
      subject: data.subject,
      description: data.description,
      employee: "Sarah Connor",
      employeeId: "TL001",
      employeeEmail: "sarah.connor@company.com",
      department: data.departments && data.departments.length > 0 ? data.departments.join(', ') : (data.department || "IT Support"),
      departments: data.departments || [],
      taggedMembers: data.taggedMembers || [],
      taggedMemberIds: data.taggedMemberIds || [],
      teamLeads: data.teamLeads || [],
      teamLeadIds: data.teamLeadIds || [],
      taggedEmployees: data.taggedEmployees || [],
      employeeIds: data.employeeIds || [],
      category: data.category,
      priority: data.priority,
      status: "Open",
      assignedAgent: assignedAgentName,
      handledBy: taggedEmps.length > 0 ? "employee" : "unassigned",
      assignedToType: taggedEmps.length > 0 ? "employee" : "unassigned",
      slaStatus: "Within SLA",
      slaRemaining: "8h 00m remaining",
      createdAt: now,
      updatedAt: now,
      attachments: data.attachments || [],
      comments: [],
      activities: [
        {
          id: `act-${Date.now()}-1`,
          ticketId: ticketId,
          user: "Sarah Connor",
          action: "Ticket created",
          timestamp: now,
        },
        ...(data.teamLeads && data.teamLeads.length > 0
          ? [
              {
                id: `act-${Date.now()}-2`,
                ticketId: ticketId,
                user: "System",
                action: `Assigned Team Lead: ${data.teamLeads.map((tl) => `${tl.name} (${tl.employeeId})`).join(', ')}`,
                timestamp: now,
              },
            ]
          : []),
        ...(taggedEmps.length > 0
          ? [
              {
                id: `act-${Date.now()}-3`,
                ticketId: ticketId,
                user: "System",
                action: `Assigned Team Member(s): ${assignedAgentName}`,
                timestamp: now,
              },
            ]
          : []),
      ],
    };

    setTickets((prev) => [newTicket, ...prev]);

    // Create notification
    const newNotif: NotificationItem = {
      id: `n-${Date.now()}`,
      title: "New Ticket Created",
      message: `Ticket ${ticketId} created successfully: "${data.subject}". Email sent successfully.`,
      timestamp: "Just now",
      read: false,
      ticketId: ticketId,
      type: "info",
      forRole: "teamlead",
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return newTicket;
  };

  const workOnTicket = (ticketId: string) => {
    const now = new Date().toISOString();
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updated: Ticket = {
            ...t,
            assignedAgent: "Alex Morgan",
            assignedAgentId: "TL001",
            assignedToType: "teamlead",
            handledBy: "teamlead",
            status: "In Progress",
            assignedBy: "Alex Morgan (Team Lead)",
            assignedDate: now,
            updatedAt: now,
            activities: [
              ...(t.activities || []),
              {
                id: `act-${Date.now()}`,
                ticketId,
                user: "Alex Morgan",
                action: "Team Lead took ownership to work on ticket",
                timestamp: now,
              },
            ],
          };
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  const updateStatus = (ticketId: string, status: TicketStatus) => {
    const now = new Date().toISOString();
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updated: Ticket = {
            ...t,
            status,
            updatedAt: now,
            activities: [
              ...(t.activities || []),
              {
                id: `act-${Date.now()}`,
                ticketId,
                user: "Alex Morgan",
                action: `Status changed to ${status}`,
                timestamp: now,
              },
            ],
          };
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  const assignAgent = (ticketId: string, agentId: string, agentName: string) => {
    const now = new Date().toISOString();
    const isTeamLead = agentName === 'Alex Morgan' || agentId === 'TL001';
    const assignedToType = isTeamLead ? 'teamlead' : 'employee';
    const handledBy = isTeamLead ? 'teamlead' : 'employee';

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updated: Ticket = {
            ...t,
            assignedAgent: agentName,
            assignedAgentId: agentId,
            assignedToType,
            handledBy,
            assignedBy: "Alex Morgan (Team Lead)",
            assignedDate: now,
            updatedAt: now,
            activities: [
              ...(t.activities || []),
              {
                id: `act-${Date.now()}`,
                ticketId,
                user: "Alex Morgan",
                action: `Assigned agent to ${agentName}`,
                timestamp: now,
              },
            ],
          };
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  const changePriority = (ticketId: string, priority: TicketPriority) => {
    const now = new Date().toISOString();
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updated: Ticket = {
            ...t,
            priority,
            updatedAt: now,
            activities: [
              ...(t.activities || []),
              {
                id: `act-${Date.now()}`,
                ticketId,
                user: "Alex Morgan",
                action: `Priority updated to ${priority}`,
                timestamp: now,
              },
            ],
          };
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  const addComment = (
    ticketId: string,
    authorName: string,
    authorRole: 'teamlead' | 'employee' | 'agent',
    message: string,
    isInternal: boolean = false
  ) => {
    const now = new Date().toISOString();
    const newComment = {
      id: `c-${Date.now()}`,
      ticketId,
      authorName,
      authorRole,
      message,
      createdAt: now,
      isInternal,
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updated: Ticket = {
            ...t,
            updatedAt: now,
            comments: [...(t.comments || []), newComment],
            activities: [
              ...(t.activities || []),
              {
                id: `act-${Date.now()}`,
                ticketId,
                user: authorName,
                action: isInternal ? "Added internal note" : "Added reply",
                timestamp: now,
              },
            ],
          };
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  const escalateTicket = (ticketId: string, reason: string, escalatedBy: string) => {
    const now = new Date().toISOString();
    let targetTicket: Ticket | undefined;

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          targetTicket = t;
          const updated: Ticket = {
            ...t,
            status: "Escalated",
            escalationReason: reason,
            updatedAt: now,
            activities: [
              ...(t.activities || []),
              {
                id: `act-${Date.now()}`,
                ticketId,
                user: escalatedBy,
                action: `Escalated ticket: ${reason}`,
                timestamp: now,
              },
            ],
          };
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return t;
      })
    );

    if (targetTicket) {
      const newEscalation: Escalation = {
        id: `ESC-${Math.floor(200 + Math.random() * 800)}`,
        ticketId: ticketId,
        subject: targetTicket.subject,
        priority: targetTicket.priority,
        escalatedBy: escalatedBy,
        escalatedTo: "Tier 3 Operations",
        escalationReason: reason,
        slaStatus: targetTicket.slaStatus,
        escalatedDate: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "Pending Review",
      };
      setEscalations((prev) => [newEscalation, ...prev]);
    }
  };

  const resolveTicket = (ticketId: string, resolutionSummary?: string) => {
    const now = new Date().toISOString();
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updated: Ticket = {
            ...t,
            status: "Resolved",
            resolutionSummary: resolutionSummary || t.resolutionSummary || "Issue resolved by assigned team lead.",
            updatedAt: now,
            activities: [
              ...(t.activities || []),
              {
                id: `act-${Date.now()}`,
                ticketId,
                user: "Alex Morgan",
                action: "Ticket marked as Resolved",
                timestamp: now,
              },
            ],
          };
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  const addAttachment = (ticketId: string, attachment: { name: string; size: string }) => {
    const now = new Date().toISOString();
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updated: Ticket = {
            ...t,
            updatedAt: now,
            attachments: [...(t.attachments || []), attachment],
            activities: [
              ...(t.activities || []),
              {
                id: `act-${Date.now()}`,
                ticketId,
                user: "Alex Morgan",
                action: `Added attachment: ${attachment.name}`,
                timestamp: now,
              },
            ],
          };
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  const markNotificationRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <TicketContext.Provider
      value={{
        tickets,
        escalations,
        notifications,
        selectedTicket,
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
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};
