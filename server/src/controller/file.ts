import type { Context } from "koa";
import { Code } from "../code";
import { logger } from "../config";
import { uploadFile4rag } from "../service/file";
import { codeOf, success } from "./response";

export async function uploadFile(ctx: Context): Promise<void> {
  const file = ctx.file;
  if (!file) {
    logger.warn("Uploaded file not found");
    ctx.body = codeOf(Code.ParamsInvalid);
    return;
  }

  const username = String(ctx.state.username);
  if (!username) {
    logger.warn("Username is empty");
    ctx.body = codeOf(Code.TokenInvalid);
    return;
  }

  try {
    const filepath = await uploadFile4rag(username, file);
    ctx.body = success({ filepath });
  } catch (err) {
    logger.error({ err }, "Upload file error");
    ctx.body = codeOf(Code.ServerError);
  }
}
