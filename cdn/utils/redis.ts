import Redis from "ioredis";

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: "EX", ttl?: number): Promise<unknown>;
};

const memoryStore = new Map<string, { value: string; expiresAt: number }>();

const memoryRedis: RedisLike = {
  async get(key) {
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },
  async set(key, value, mode, ttl) {
    const expiresAt = mode === "EX" && ttl ? Date.now() + ttl * 1000 : 0;
    memoryStore.set(key, { value, expiresAt });
    return "OK";
  },
};

const useMemoryRedis = process.env.REDIS_DISABLED === "true" || process.env.NODE_ENV === "development";

const redisClient = useMemoryRedis
  ? null
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });

const redis: RedisLike = useMemoryRedis
  ? memoryRedis
  : {
      get: (key) => redisClient!.get(key),
      set: (key, value, mode, ttl) => {
        if (mode === "EX" && ttl) return redisClient!.set(key, value, "EX", ttl);
        return redisClient!.set(key, value);
      },
    };

if (redisClient) {
  redisClient.on("connect", () => console.log("Redis Connected"));
  redisClient.on("error", (error) => console.error("Redis Error", error.message));
} else {
  console.log("Redis disabled; using in-memory replay cache for local CDN.");
}

export default redis;
