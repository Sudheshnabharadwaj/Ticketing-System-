export const APP_NAME = "Ticketing Portal";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const CATEGORIES = [
  'Hardware',
  'Software',
  'Network',
  'Access Issue',
  'Email',
  'Application',
  'Other'
] as const;

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export const STATUSES = ['Open', 'Pending', 'Resolved', 'Closed', 'Escalated'] as const;

export const KB_CATEGORIES = [
  'Account & Access',
  'Hardware',
  'Software',
  'Network',
  'Email',
  'Applications',
  'General Help'
] as const;
