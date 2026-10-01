/**
 * Shared TypeScript types across the frontend.
 * Keep in sync with backend Pydantic schemas.
 */

export interface User {
  id: string;
  keycloak_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role?: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface ApiError {
  detail: string;
  type: string;
}
