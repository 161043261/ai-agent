import { randomUUID } from "crypto";
import type { ServerResponse } from "http";
import { getAiAgentManager } from "../ai/manager";
import type { ModelType } from "../ai/model";
import { Code } from "../code";
import { getConfig, logger } from "../config";
import { createSession } from "../dao/session";
import type { History } from "../model/message";
import type { SessionDto } from "../model/session";

function getSessionsByUsername(username: string): SessionDto[] {
  const manager = getAiAgentManager();
  const sessionIds = manager.getUserAllSessionIds(username);
  return sessionIds.map((id) => ({ id, title: id }));
}

async function createSessionAndSendMessage(
  username: string,
  userMessage: string,
  modelType: ModelType,
): Promise<[string, string, Code]> {
  const sessionId = randomUUID();
  try {
    await createSession({ id: sessionId, username, title: userMessage });
  } catch (err) {
    logger.error({ err }, "Create session error");
    return ["", "", Code.ServerError];
  }

  const manager = getAiAgentManager();
  const cfg = { username };

  try {
    const aiAgent = manager.getOrCreateAiAgent(
      username,
      sessionId,
      modelType,
      cfg,
    );
    const aiMessage = await aiAgent.response(username, userMessage);
    return [sessionId, aiMessage.content, Code.OK];
  } catch (err) {
    logger.error({ err }, "AI agent response error");
    return ["", "", Code.ModelError];
  }
}

async function createStreamSession(
  username: string,
  userMessage: string,
): Promise<[string, Code]> {
  const sessionId = randomUUID();
  try {
    await createSession({ id: sessionId, username, title: userMessage });
    return [sessionId, Code.OK];
  } catch (err) {
    logger.error({ err }, "Create session error");
    return ["", Code.ServerError];
  }
}

async function sendMessageStream2session(
  username: string,
  userMessage: string,
  modelType: ModelType,
  sessionId: string,
  res: ServerResponse,
): Promise<Code> {
  const manager = getAiAgentManager();
  const cfg = { username };

  try {
    const aiAgent = manager.getOrCreateAiAgent(
      username,
      sessionId,
      modelType,
      cfg,
    );
    const cb = (chunk: string) => {
      logger.info(`SSE send chunk: ${chunk} (len=${chunk.length})`);
      res.write(`data: ${chunk}\n\n`);
    };
    await aiAgent.responseStream(username, userMessage, cb);
    res.write("data: [DONE]\n\n");
    return Code.OK;
  } catch (err) {
    logger.error({ err }, "Stream message error");
    return Code.ModelError;
  }
}

async function sendMessage2session(
  username: string,
  userMessage: string,
  modelType: ModelType,
  sessionId: string,
): Promise<[string, Code]> {
  const manager = getAiAgentManager();
  const cfg = { username };

  try {
    const aiAgent = manager.getOrCreateAiAgent(
      username,
      sessionId,
      modelType,
      cfg,
    );
    const aiMessage = await aiAgent.response(username, userMessage);
    return [aiMessage.content, Code.OK];
  } catch (err) {
    logger.error({ err }, "AI agent response error");
    return ["", Code.ModelError];
  }
}

function getChatHistoryList(
  username: string,
  sessionId: string,
): [History[], Code] {
  const manager = getAiAgentManager();
  const aiAgent = manager.getAiAgent(username, sessionId);
  if (!aiAgent) {
    return [[], Code.ServerError];
  }
  const messages = aiAgent.getMessages();
  const historyList: History[] = messages.map((m) => ({
    is_user: m.is_user,
    content: m.content,
  }));
  return [historyList, Code.OK];
}

const sessionService = {
  getSessionsByUsername,
  createSessionAndSendMessage,
  createStreamSession,
  sendMessageStream2session,
  sendMessage2session,
  getChatHistoryList,
};

export default sessionService;
