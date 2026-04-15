import type { Context, Next } from "koa";
import { Code, codeMessage } from "../code";
import { logger } from "../config";
import { parseToken } from "../utils/jwt";

export async function auth(ctx: Context, next: Next): Promise<void> {
  let token = "";
  const authHeader = ctx.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    token =
      (Array.isArray(ctx.request.query.token)
        ? ctx.request.query.token[0]
        : ctx.request.query.token) ?? "";
  }

  if (!token) {
    ctx.body = {
      code: Code.TokenInvalid,
      message: codeMessage(Code.TokenInvalid),
    };
    return;
  }

  logger.info(`Auth middleware, token: ${token}`);
  const [username, ok] = parseToken(token);
  if (!ok) {
    ctx.body = {
      code: Code.TokenInvalid,
      message: codeMessage(Code.TokenInvalid),
    };
    return;
  }

  ctx.state.username = username;
  await next();
}
