export type UserRole = 'teamlead' | 'employee';
export type UserStatus = 'Active' | 'Inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  department?: string;
  designation?: string;
  team?: string;
  avatar?: string;
  location?: string;
  status: UserStatus;
}
