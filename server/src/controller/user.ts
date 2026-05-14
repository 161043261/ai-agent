import type { Context } from "koa";
import { z } from "zod";
import { Code } from "../code";
import userService from "../service/user";
import { codeOf, success } from "./response";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export async function login(ctx: Context): Promise<void> {
  const parsed = loginSchema.safeParse(ctx.request.body);
  if (!parsed.success) {
    ctx.body = codeOf(Code.ParamsInvalid);
    return;
  }
  const { username, password } = parsed.data;

  const [token, code] = await userService.login(username, password);
  if (code !== Code.OK) {
    ctx.body = codeOf(code);
    return;
  }

  ctx.body = success({ token });
}

export async function register(ctx: Context): Promise<void> {
  const parsed = registerSchema.safeParse(ctx.request.body);
  if (!parsed.success) {
    ctx.body = codeOf(Code.ParamsInvalid);
    return;
  }
  const { email, password } = parsed.data;

  const [token, username, code] = await userService.register(email, password);
  if (code !== Code.OK) {
    ctx.body = codeOf(code);
    return;
  }

  ctx.body = success({ token, username });
}
