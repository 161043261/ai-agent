import { getDb } from "../db/mysql";
import type { Session } from "../model/session";

function sessions() {
  return getDb()<Session>("sessions");
}

export async function createSession(
  session: Pick<Session, "id" | "username" | "title">,
): Promise<void> {
  await sessions().insert(session);
}

export async function getSessionById(
  sessionId: string,
): Promise<Session | null> {
  const row = await sessions()
    .where({ id: sessionId })
    .whereNull("deleted_at")
    .first();
  return row ?? null;
}

export async function getSessionByUsername(
  username: string,
): Promise<Session[]> {
  return sessions().where({ username }).whereNull("deleted_at");
}
