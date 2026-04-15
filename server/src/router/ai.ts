import Router from "@koa/router";
import {
  createSessionAndSendMessage,
  createStreamSessionAndSendMessageStream,
  getChatHistoryList,
  getUserSessionsByUsername,
  sendMessage2session,
  sendMessageStream2session,
} from "../controller/session";
import { auth } from "../middleware/auth";

export function aiRouter(): Router {
  const router = new Router();
  router.use(auth);
  router.get("/chat/get-user-sessions-by-username", getUserSessionsByUsername);
  router.post(
    "/chat/create-session-and-send-message",
    createSessionAndSendMessage,
  );
  router.post("/chat/send-message-2-session", sendMessage2session);
  router.post("/chat/send-message-stream-2-session", sendMessageStream2session);
  router.post("/chat/get-chat-history-list", getChatHistoryList);
  router.post(
    "/chat/create-session-and-send-message-stream",
    createStreamSessionAndSendMessageStream,
  );
  return router;
}
