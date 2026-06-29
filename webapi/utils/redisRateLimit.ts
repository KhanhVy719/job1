import crypto from "crypto";
import redis from "./redis";

type RateLimitInput = {
  scope: string;
  identity: string;
  max: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  count: number;
  remaining: number;
  resetInSeconds: number;
  source: "redis" | "memory";
};

function safePart(value: string): string {
  const normalized = String(value || "unknown").trim().slice(0, 256);
  return crypto.createHash("sha256").update(normalized || "unknown").digest("base64url").slice(0, 32);
}

export async function checkFixedWindowRateLimit({ scope, identity, max, windowSeconds }: RateLimitInput): Promise<RateLimitResult> {
  const limit = Math.max(1, Math.floor(max));
  const windowSize = Math.max(1, Math.floor(windowSeconds));
  const key = `ratelimit:${safePart(scope)}:${safePart(identity)}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSize);
  }

  let ttl = await redis.ttl(key);
  if (ttl < 0) {
    await redis.expire(key, windowSize);
    ttl = windowSize;
  }

  return {
    allowed: count <= limit,
    count,
    remaining: Math.max(0, limit - count),
    resetInSeconds: ttl,
    source: "redis",
  };
}

export function setRateLimitHeaders(res: { setHeader(name: string, value: string | number): void }, result: RateLimitResult, limit: number) {
  res.setHeader("RateLimit-Limit", limit);
  res.setHeader("RateLimit-Remaining", result.remaining);
  res.setHeader("RateLimit-Reset", result.resetInSeconds);
}
