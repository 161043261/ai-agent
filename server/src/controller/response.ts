import { Code, codeMessage } from "../code";

export interface ResponseBody {
  code: Code;
  message?: string;
  [key: string]: unknown;
}

export function codeOf(code: Code): ResponseBody {
  return { code, message: codeMessage(code) };
}

export function success(extra?: Record<string, unknown>): ResponseBody {
  return { code: Code.OK, message: codeMessage(Code.OK), ...extra };
}
