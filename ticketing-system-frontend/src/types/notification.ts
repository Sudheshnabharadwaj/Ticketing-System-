export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  ticketId?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  forRole: 'teamlead' | 'employee' | 'all';
}
