import { LRUCache } from "lru-cache";
import { getConfig, logger } from "../config";
import { getDb } from "./mysql";
import {
  deleteRedisCache,
  getRedisCache,
  initRedis,
  setRedisCache,
  testRedisConnection,
} from "./redis";

let lruCache: LRUCache<string, string> | null = null;

let redisEnabled = false;

export function isRedisEnabled(): boolean {
  return redisEnabled;
}

export async function initCache(): Promise<void> {
  const cfg = getConfig().redis;
  if (cfg.enabled) {
    initRedis();
    const ok = await testRedisConnection();
    if (ok) {
      redisEnabled = true;
      logger.info("Redis connected");
      return;
    }
    logger.warn("Connect to redis error, fallback to LRU cache");
  }
  initLruCache();
}

function initLruCache(): void {
  lruCache = new LRUCache<string, string>({
    max: 10000,
    ttl: 10 * 60 * 1000,
    maxSize: 256 * 1024 * 1024,
    sizeCalculation: (value) => Buffer.byteLength(value),
  });
  logger.info("LRU cache initialized");
}

export async function saveMessage(
  sessionId: string,
  content: string,
  username: string,
  isUser: boolean,
): Promise<void> {
  await getDb()("messages").insert({
    session_id: sessionId,
    content,
    username,
    is_user: isUser,
  });
  logger.info(
    `Message persisted, sessionId=${sessionId}, username=${username}`,
  );
}

export async function cacheSet(
  key: string,
  value: string,
  expirationSec?: number,
): Promise<void> {
  if (isRedisEnabled()) {
    await setRedisCache(key, value, expirationSec);
    return;
  }
  lruCache?.set(key, value);
}

export async function cacheGet(key: string): Promise<string | null> {
  if (isRedisEnabled()) {
    return getRedisCache(key);
  }
  return lruCache?.get(key) ?? null;
}

export async function cacheDelete(key: string): Promise<void> {
  if (isRedisEnabled()) {
    await deleteRedisCache(key);
    return;
  }
  lruCache?.delete(key);
}
