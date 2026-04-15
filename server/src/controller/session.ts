import type { Context } from "koa";
import { z } from "zod";
import { ModelType } from "../ai/model";
import { Code } from "../code";
import { logger } from "../config";
import sessionService from "../service/session";
import { codeOf, success } from "./response";

const questionModelSchema = z.object({
  question: z.string().min(1),
  model_type: z.enum(ModelType),
});

const questionModelSessionSchema = questionModelSchema.extend({
  session_id: z.string().min(1),
});

const sessionIdSchema = z.object({
  session_id: z.string().min(1),
});

export async function getUserSessionsByUsername(ctx: Context): Promise<void> {
  const username = String(ctx.state.username);
  logger.info({ username }, "Get user sessions by username");
  const sessions = sessionService.getSessionsByUsername(username);
  ctx.body = success({ sessions });
}

export async function createSessionAndSendMessage(ctx: Context): Promise<void> {
  const username = String(ctx.state.username);
  const parsed = questionModelSchema.safeParse(ctx.request.body);
  if (!parsed.success) {
    ctx.body = codeOf(Code.ParamsInvalid);
    return;
  }
  const { question, model_type } = parsed.data;

  const [sessionId, aiMessage, code] =
    await sessionService.createSessionAndSendMessage(
      username,
      question,
      model_type,
    );
  if (code !== Code.OK) {
    ctx.body = codeOf(code);
    return;
  }

  ctx.body = success({ session_id: sessionId, answer: aiMessage });
}

export async function createStreamSessionAndSendMessageStream(
  ctx: Context,
): Promise<void> {
  const username = String(ctx.state.username);
  const parsed = questionModelSchema.safeParse(ctx.request.body);
  if (!parsed.success) {
    ctx.body = codeOf(Code.ParamsInvalid);
    return;
  }
  const { question, model_type } = parsed.data;

  const res = ctx.res;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const [sessionId, sessionCode] = await sessionService.createStreamSession(
    username,
    question,
  );
  if (sessionCode !== Code.OK) {
    logger.error("Create stream session error");
    res.write(`event: error\ndata: ${JSON.stringify(codeOf(sessionCode))}\n\n`);
    res.end();
    return;
  }

  res.write(`data: ${JSON.stringify({ session_id: sessionId })}\n\n`);

  const code = await sessionService.sendMessageStream2session(
    username,
    question,
    model_type,
    sessionId,
    res,
  );
  if (code !== Code.OK) {
    logger.error("Send message stream to session error");
    res.write(`event: error\ndata: ${JSON.stringify(codeOf(code))}\n\n`);
  }
  res.end();
}

export async function sendMessage2session(ctx: Context): Promise<void> {
  const username = String(ctx.state.username);
  const parsed = questionModelSessionSchema.safeParse(ctx.request.body);
  if (!parsed.success) {
    ctx.body = codeOf(Code.ParamsInvalid);
    return;
  }
  const { question, model_type, session_id } = parsed.data;

  const [aiMessage, code] = await sessionService.sendMessage2session(
    username,
    question,
    model_type,
    session_id,
  );
  if (code !== Code.OK) {
    ctx.body = codeOf(code);
    return;
  }

  ctx.body = success({ answer: aiMessage });
}

export async function sendMessageStream2session(ctx: Context): Promise<void> {
  const username = String(ctx.state.username);
  const parsed = questionModelSessionSchema.safeParse(ctx.request.body);
  if (!parsed.success) {
    ctx.body = codeOf(Code.ParamsInvalid);
    return;
  }
  const { question, model_type, session_id } = parsed.data;

  const res = ctx.res;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const code = await sessionService.sendMessageStream2session(
    username,
    question,
    model_type,
    session_id,
    res,
  );
  if (code !== Code.OK) {
    logger.error("Send message stream to session error");
    res.write(`event: error\ndata: ${JSON.stringify(codeOf(code))}\n\n`);
  }
  res.end();
}

export async function getChatHistoryList(ctx: Context): Promise<void> {
  const username = String(ctx.state.username);
  const parsed = sessionIdSchema.safeParse(ctx.request.body);
  if (!parsed.success) {
    ctx.body = codeOf(Code.ParamsInvalid);
    return;
  }
  const { session_id } = parsed.data;

  const [historyList, code] = sessionService.getChatHistoryList(
    username,
    session_id,
  );
  if (code !== Code.OK) {
    ctx.body = codeOf(code);
    return;
  }

  ctx.body = success({ history: historyList });
}
