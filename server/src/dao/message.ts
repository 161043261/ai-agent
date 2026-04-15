import { getDb } from "../db/mysql";
import type { Message } from "../model/message";

function messages() {
  return getDb()<Message>("messages");
}

export async function getMessageBySessionId(
  sessionId: string,
): Promise<Message[]> {
  return messages()
    .where({ session_id: sessionId })
    .orderBy("created_at", "asc");
}

export async function getMessagesBySessionIds(
  sessionIds: string[],
): Promise<Message[]> {
  if (sessionIds.length === 0) return [];
  return messages()
    .whereIn("session_id", sessionIds)
    .orderBy("created_at", "asc");
}

export async function createMessage(
  message: Pick<Message, "session_id" | "username" | "content" | "is_user">,
): Promise<void> {
  await messages().insert(message);
}

export async function getAllMessages(): Promise<Message[]> {
  return messages().orderBy("created_at", "asc");
}
