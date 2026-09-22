import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { User } from "@/types";

async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/api/v1/users/me");
  return data;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,             // don't retry on 401
  });
}
