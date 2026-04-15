import { useMutation } from "@tanstack/react-query";
import fetchClient from "@/api/fetch-client";
import type { ChatResponse, ModelType } from "@/types";

interface CreateSessionAndSendParams {
  question: string;
  model_type: ModelType;
}

interface SendToSessionParams extends CreateSessionAndSendParams {
  session_id: string;
}

export function useCreateSessionAndSendMessage() {
  return useMutation({
    mutationFn: async (params: CreateSessionAndSendParams) => {
      const { data } = await fetchClient.post<ChatResponse>(
        "/ai/chat/create-session-and-send-message",
        params,
      );
      return data;
    },
  });
}

export function useSendMessage2Session() {
  return useMutation({
    mutationFn: async (params: SendToSessionParams) => {
      const { data } = await fetchClient.post<ChatResponse>(
        "/ai/chat/send-message-2-session",
        params,
      );
      return data;
    },
  });
}
