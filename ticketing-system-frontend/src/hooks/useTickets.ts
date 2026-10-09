import { useContext } from 'react';
import { TicketContext } from '../context/TicketContext';

export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
};
