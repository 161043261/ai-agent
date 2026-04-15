import { useQuery } from "@tanstack/react-query";
import fetchClient from "@/api/fetch-client";
import type { HistoryResponse } from "@/types";

export const CHAT_HISTORY_QUERY_KEY = (sessionId: string) =>
  ["chatHistory", sessionId] as const;

export function useChatHistory(sessionId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: CHAT_HISTORY_QUERY_KEY(sessionId ?? ""),
    queryFn: async () => {
      const { data } = await fetchClient.post<HistoryResponse>(
        "/ai/chat/get-chat-history-list",
        { session_id: sessionId },
      );
      return data;
    },
    enabled: !!sessionId && sessionId !== "temp" && enabled,
  });
}
