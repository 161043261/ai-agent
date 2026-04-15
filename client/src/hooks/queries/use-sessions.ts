import { useQuery } from "@tanstack/react-query";
import fetchClient from "@/api/fetch-client";
import type { SessionsResponse } from "@/types";

export const SESSIONS_QUERY_KEY = ["sessions"] as const;

export function useSessions() {
  return useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await fetchClient.get<SessionsResponse>(
        "/ai/chat/get-user-sessions-by-username",
      );
      return data;
    },
  });
}
