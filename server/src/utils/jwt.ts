import jwt from "jsonwebtoken";
import { getConfig, logger } from "../config";

interface Claims {
  id: number;
  username: string;
}

export function jwtToken(id: number, username: string): string {
  const cfg = getConfig().jwt;
  const payload: Claims = { id, username };
  return jwt.sign(payload, cfg.key, {
    expiresIn: `${cfg.expire_duration}h`,
    issuer: cfg.issuer,
    subject: cfg.subject,
  });
}

export function parseToken(token: string): [string, boolean] {
  try {
    const cfg = getConfig().jwt;
    const decoded = jwt.verify(token, cfg.key);
    if (!decoded || typeof decoded === "string" || !decoded.username) {
      return ["", false];
    }
    return [String(decoded.username), true];
  } catch (err) {
    logger.error({ err }, "Parse token error");
    return ["", false];
  }
}
