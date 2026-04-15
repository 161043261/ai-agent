import { bodyParser } from "@koa/bodyparser";
import cors from "@koa/cors";
import Koa from "koa";
import { getAiAgentManager } from "./ai/manager";
import { ModelType } from "./ai/model";
import { getConfig, logger } from "./config";
import { getAllMessages } from "./dao/message";
import { initCache } from "./db/cache";
import { initMysql } from "./db/mysql";
import { initRouter } from "./router";

async function loadDataFromDb(): Promise<void> {
  const manager = getAiAgentManager();
  try {
    const messages = await getAllMessages();
    for (const msg of messages) {
      try {
        const aiAgent = manager.getOrCreateAiAgent(
          msg.username,
          msg.session_id,
          ModelType.OLLAMA_MODEL,
          {},
        );
        aiAgent.addMessage(msg.content, msg.username, msg.is_user, false);
      } catch (err) {
        logger.error(
          { err, username: msg.username, sessionId: msg.session_id },
          "Create ai agent error",
        );
      }
    }
    logger.info("AI agent manager initialized");
  } catch (err) {
    logger.error({ err }, "Get all messages error");
  }
}

async function main(): Promise<void> {
  const appConfig = getConfig().app;

  // Initialize MySQL
  try {
    await initMysql();
  } catch (err) {
    logger.error({ err }, "MySQL initialize error");
    process.exit(1);
  }

  // Load historical data
  await loadDataFromDb();

  // Initialize cache (Redis or LRU)
  try {
    await initCache();
  } catch (err) {
    logger.error({ err }, "Cache initialize error");
    process.exit(1);
  }

  // Create Koa app
  const app = new Koa();

  app.use(cors());
  app.use(bodyParser());

  const router = initRouter();
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.listen(appConfig.port, appConfig.host, () => {
    logger.info(`Server running on ${appConfig.host}:${appConfig.port}`);
  });
}

main().catch((err) => {
  logger.fatal({ err }, "Fatal error");
  process.exit(1);
});
