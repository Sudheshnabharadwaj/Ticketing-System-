import { User } from '../types/user';
import { Escalation } from '../types/escalation';
import { mockUsers } from '../mock/users';
import { mockEscalations } from '../mock/escalations';

export const teamLeadService = {
  getEmployees: async (): Promise<User[]> => {
    return new Promise((resolve) => setTimeout(() => resolve([...mockUsers]), 150));
  },

  getEscalations: async (): Promise<Escalation[]> => {
    return new Promise((resolve) => setTimeout(() => resolve([...mockEscalations]), 150));
  },

  reassignTicket: async (ticketId: string, newEmployeeId: string): Promise<boolean> => {
    return new Promise((resolve) => setTimeout(() => resolve(true), 150));
  },

  escalateTicket: async (ticketId: string, reason: string): Promise<boolean> => {
    return new Promise((resolve) => setTimeout(() => resolve(true), 150));
  }
};

