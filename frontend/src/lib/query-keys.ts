/**
 * Centralized TanStack Query key factory.
 * Using a factory pattern makes invalidation predictable and refactorable.
 */

export const queryKeys = {
  users: {
    all: () => ["users"] as const,
    me: () => ["users", "me"] as const,
    byId: (id: string) => ["users", id] as const,
    list: (params?: { page?: number; size?: number }) =>
      ["users", "list", params] as const,
  },
} as const;
