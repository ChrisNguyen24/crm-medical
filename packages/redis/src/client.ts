import Redis from "ioredis";
import { env } from "@crm/config";
import { createLogger } from "@crm/logger";

const log = createLogger("redis");

let instance: Redis | null = null;

export function createRedisClient(): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    lazyConnect: true,
  });

  client.on("connect", () => log.info("Redis connected"));
  client.on("error", (err) => log.error({ err }, "Redis error"));
  client.on("reconnecting", () => log.warn("Redis reconnecting"));

  return client;
}

export function getRedis(): Redis {
  if (!instance) {
    instance = createRedisClient();
  }
  return instance;
}
