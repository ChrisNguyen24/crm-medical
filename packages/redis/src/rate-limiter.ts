import { getRedis } from "./client";

/**
 * Token bucket rate limiter backed by Redis.
 * Used to stay within platform API outbound limits.
 */
export class RateLimiter {
  constructor(
    private readonly key: string,
    private readonly maxTokens: number,
    private readonly refillPerSecond: number,
  ) {}

  async consume(tokens = 1): Promise<boolean> {
    const redis = getRedis();
    const now = Date.now();
    const bucketKey = `ratelimit:${this.key}`;

    const luaScript = `
      local key = KEYS[1]
      local max = tonumber(ARGV[1])
      local refill = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local consume = tonumber(ARGV[4])

      local data = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(data[1]) or max
      local last = tonumber(data[2]) or now

      local elapsed = (now - last) / 1000
      tokens = math.min(max, tokens + elapsed * refill)

      if tokens < consume then
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, 3600)
        return 0
      end

      tokens = tokens - consume
      redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
      redis.call('EXPIRE', key, 3600)
      return 1
    `;

    const result = await redis.eval(
      luaScript, 1, bucketKey,
      String(this.maxTokens),
      String(this.refillPerSecond),
      String(now),
      String(tokens),
    ) as number;

    return result === 1;
  }
}
