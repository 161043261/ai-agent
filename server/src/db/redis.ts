import Redis from "ioredis";
import { getConfig } from "../config";

let rdb: Redis | null = null;

export function initRedis(): void {
  const cfg = getConfig().redis;
  rdb = new Redis({
    host: cfg.host,
    port: cfg.port,
    password: cfg.password || undefined,
    db: cfg.db,
  });
}

export async function testRedisConnection(): Promise<boolean> {
  if (!rdb) return false;
  try {
    await rdb.ping();
    return true;
  } catch {
    return false;
  }
}

export function setRedisCache(
  key: string,
  value: string,
  expirationSec?: number,
): Promise<string | null> {
  if (!rdb) throw new Error("Redis not initialized");
  if (expirationSec) {
    return rdb.set(key, value, "EX", expirationSec);
  }
  return rdb.set(key, value);
}

export function getRedisCache(key: string): Promise<string | null> {
  if (!rdb) throw new Error("Redis not initialized");
  return rdb.get(key);
}

export function deleteRedisCache(key: string): Promise<number> {
  if (!rdb) throw new Error("Redis not initialized");
  return rdb.del(key);
}
