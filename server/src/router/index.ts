import Router from "@koa/router";
import { aiRouter } from "./ai";
import { fileRouter } from "./file";
import { userRouter } from "./user";

export function initRouter(): Router {
  const router = new Router({ prefix: "/api/v1" });

  // User routes (no auth)
  router.use("/user", userRouter().routes(), userRouter().allowedMethods());

  // AI routes (auth inside aiRouter)
  router.use("/ai", aiRouter().routes(), aiRouter().allowedMethods());

  // File routes (auth inside fileRouter)
  router.use("/file", fileRouter().routes(), fileRouter().allowedMethods());

  return router;
}
