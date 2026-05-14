import Router from "@koa/router";
import { login, register } from "../controller/user";

export function userRouter(): Router {
  const router = new Router();
  router.post("/login", login);
  router.post("/register", register);
  return router;
}
