import React, { createContext, useState, useEffect } from 'react';
import { Ticket, TicketStatus, TicketPriority, TicketCategory } from '../types/ticket';
import { Escalation } from '../types/escalation';
import { NotificationItem } from '../types/notification';
import { ticketService } from '../services/ticketService';
import { teamLeadService } from '../services/teamLeadService';
import { useAuth } from '../hooks/useAuth';
import { mockTickets } from '../mock/tickets';
import { mockEscalations } from '../mock/escalations';

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
    teamLeads?: any[];
    teamLeadIds?: string[];
    taggedEmployees?: any[];
    taggedEmployeeIds?: string[];
    employeeIds?: string[];
    attachments?: { name: string; size: string }[];
    [key: string]: any;
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
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [escalations, setEscalations] = useState<Escalation[]>(mockEscalations);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    ticketService.getTickets().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setTickets(loaded);
      }
    });
    teamLeadService.getEscalations().then((loadedEsc) => {
      if (loadedEsc && loadedEsc.length > 0) {
        setEscalations(loadedEsc);
      }
    });
    teamLeadService.getNotifications(user?.role || 'teamlead', user?.name || '').then((loadedNotifs) => {
      setNotifications(loadedNotifs || []);
    });
  }, [user?.role, user?.name]);

  const currentUserName = user?.name || "Team Lead";
  const currentUserId = user?.id || "TL001";
  const currentUserEmail = user?.email || "teamlead@ticketing.com";

  const createTicket = (data: {
    subject: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    department?: string;
    departments?: string[];
    taggedMembers?: { id: string; name: string; department: string; avatar?: string }[];
    taggedMemberIds?: string[];
    attachments?: { name: string; size: string }[];
  }): Ticket => {
    const nextNum = Math.floor(1000 + Math.random() * 9000);
    const ticketId = `TKT-${nextNum}`;
    const now = new Date().toISOString();

    const newTicket: Ticket = {
      id: ticketId,
      subject: data.subject,
      description: data.description,
      employee: currentUserName,
      employeeId: currentUserId,
      employeeEmail: currentUserEmail,
      department: data.departments && data.departments.length > 0 ? data.departments.join(', ') : (data.department || "IT Support"),
      departments: data.departments || [],
      taggedMembers: data.taggedMembers || [],
      taggedMemberIds: data.taggedMemberIds || [],
      category: data.category,
      priority: data.priority,
      status: "Open",
      assignedAgent: "Unassigned",
      handledBy: "unassigned",
      assignedToType: "unassigned",
      slaStatus: "Within SLA",
      slaRemaining: "8h 00m remaining",
      createdAt: now,
      updatedAt: now,
      attachments: data.attachments || [],
      comments: [],
      activities: [
        {
          id: `act-${Date.now()}`,
          ticketId: ticketId,
          user: currentUserName,
          action: "Ticket created",
          timestamp: now,
        },
      ],
    };

    setTickets((prev) => [newTicket, ...prev]);
    ticketService.createTicket(newTicket).catch(() => {});

    teamLeadService.createNotification({
      ticketId,
      title: `New Ticket Created: ${ticketId}`,
      message: `${currentUserName} created ticket "${data.subject}"`,
      type: "info",
      forRole: "teamlead",
    }).then(() => {
      teamLeadService.getNotifications(user?.role || 'teamlead', user?.name || '').then((notifs) => {
        setNotifications(notifs || []);
      });
    }).catch(() => {});

    return newTicket;
  };

  const workOnTicket = (ticketId: string) => {
    const now = new Date().toISOString();
    const assignedByStr = `${currentUserName} (Team Lead)`;

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updated: Ticket = {
            ...t,
            assignedAgent: currentUserName,
            assignedAgentId: currentUserId,
            assignedToType: "teamlead",
            handledBy: "teamlead",
            status: "In Progress",
            assignedBy: assignedByStr,
            assignedDate: now,
            updatedAt: now,
            activities: [
              ...(t.activities || []),
              {
                id: `act-${Date.now()}`,
                ticketId,
                user: currentUserName,
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
    ticketService.assignAgent(ticketId, currentUserName, assignedByStr).catch(() => {});
    ticketService.updateTicketStatus(ticketId, "In Progress").catch(() => {});
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
                user: currentUserName,
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
    ticketService.updateTicketStatus(ticketId, status).catch(() => {});
  };

  const assignAgent = (ticketId: string, agentId: string, agentName: string) => {
    const now = new Date().toISOString();
    const isTeamLead = agentName === currentUserName || agentId === currentUserId || agentId.startsWith('TL');
    const assignedToType = isTeamLead ? 'teamlead' : 'employee';
    const handledBy = isTeamLead ? 'teamlead' : 'employee';
    const assignedByStr = `${currentUserName} (Team Lead)`;

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updated: Ticket = {
            ...t,
            assignedAgent: agentName,
            assignedAgentId: agentId,
            assignedToType,
            handledBy,
            assignedBy: assignedByStr,
            assignedDate: now,
            updatedAt: now,
            activities: [
              ...(t.activities || []),
              {
                id: `act-${Date.now()}`,
                ticketId,
                user: currentUserName,
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
    ticketService.assignAgent(ticketId, agentName, assignedByStr).catch(() => {});

    teamLeadService.createNotification({
      ticketId,
      title: `Ticket Assigned: ${ticketId}`,
      message: `${currentUserName} assigned ${ticketId} to ${agentName}.`,
      type: "info",
      forRole: isTeamLead ? "teamlead" : "employee",
    }).then(() => {
      teamLeadService.getNotifications(user?.role || 'teamlead', user?.name || '').then((notifs) => {
        setNotifications(notifs || []);
      });
    }).catch(() => {});
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
                user: currentUserName,
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
    ticketService.changePriority(ticketId, priority).catch(() => {});
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
    ticketService.addComment(ticketId, authorName, authorRole, message, isInternal).catch(() => {});
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
                user: escalatedBy || currentUserName,
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
        subject: (targetTicket as Ticket).subject,
        priority: (targetTicket as Ticket).priority,
        escalatedBy: escalatedBy || currentUserName,
        escalatedTo: "Tier 3 Operations",
        escalationReason: reason,
        slaStatus: (targetTicket as Ticket).slaStatus,
        escalatedDate: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "Pending Review",
      };
      setEscalations((prev) => [newEscalation, ...prev]);
      ticketService.escalateTicket(ticketId, reason, escalatedBy || currentUserName, (targetTicket as Ticket).subject, (targetTicket as Ticket).priority).catch(() => {});
    }

    teamLeadService.createNotification({
      ticketId,
      title: `Ticket Escalated: ${ticketId}`,
      message: `${escalatedBy || currentUserName} escalated ${ticketId}. Reason: ${reason}`,
      type: "warning",
      forRole: "teamlead",
    }).then(() => {
      teamLeadService.getNotifications(user?.role || 'teamlead', user?.name || '').then((notifs) => {
        setNotifications(notifs || []);
      });
    }).catch(() => {});
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
                user: currentUserName,
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
    ticketService.resolveTicket(ticketId, resolutionSummary).catch(() => {});

    teamLeadService.createNotification({
      ticketId,
      title: `Ticket Resolved: ${ticketId}`,
      message: `Ticket ${ticketId} resolved by ${currentUserName}.`,
      type: "success",
      forRole: "all",
    }).then(() => {
      teamLeadService.getNotifications(user?.role || 'teamlead', user?.name || '').then((notifs) => {
        setNotifications(notifs || []);
      });
    }).catch(() => {});
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
                user: currentUserName,
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
    teamLeadService.markNotificationRead(notificationId).catch(() => {});
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    teamLeadService.markAllNotificationsRead().catch(() => {});
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
