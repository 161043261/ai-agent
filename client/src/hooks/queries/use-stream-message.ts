import { useMutation } from "@tanstack/react-query";
import type { ModelType } from "@/types";

interface StreamParams {
  question: string;
  model_type: ModelType;
  session_id?: string;
  isNewSession: boolean;
}

export interface StreamCallbacks {
  onSessionCreated: (sessionId: string) => void;
  onChunk: (fullContent: string) => void;
  onDone: () => void;
  onError: () => void;
}

export function useStreamMessage(callbacks: StreamCallbacks) {
  return useMutation({
    mutationFn: async (params: StreamParams) => {
      const url = params.isNewSession
        ? "/api/ai/chat/create-session-and-send-message-stream"
        : "/api/ai/chat/send-message-stream-2-session";

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
      };

      const { ok, body } = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          question: params.question,
          model_type: params.model_type,
          ...(params.isNewSession ? {} : { session_id: params.session_id }),
        }),
      });

      if (!ok) throw new Error("Fetch error");
      const reader = body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const cleanLine = line.endsWith("\r") ? line.slice(0, -1) : line;
          if (!cleanLine || !cleanLine.startsWith("data:")) continue;

          let payload = cleanLine.slice(5);
          if (payload.startsWith(" ")) {
            payload = payload.slice(1);
          }

          if (payload === "[DONE]") {
            callbacks.onDone();
            continue;
          }

          if (payload.startsWith("{")) {
            try {
              const parsed = JSON.parse(payload);
              if (parsed.session_id) {
                callbacks.onSessionCreated(String(parsed.session_id));
                continue;
              }
            } catch {
              // Not valid JSON session data, treat as content
            }
            fullContent += payload;
            callbacks.onChunk(fullContent);
            continue;
          }

          fullContent += payload;
          callbacks.onChunk(fullContent);
        }
      }

      return fullContent;
    },
    onError: () => {
      callbacks.onError();
    },
  });
}
