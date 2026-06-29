import Redis from "ioredis";

type SetMode = "EX";

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: SetMode, ttl?: number): Promise<unknown>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
};

type MemoryItem = { value: string; expiresAt: number };

const serviceName = process.env.REDIS_SERVICE_NAME || "webapi";
const keyPrefix = (process.env.REDIS_KEY_PREFIX || process.env.REDIS_NAMESPACE || "rophim").replace(/:+$/g, "");
const memoryStore = new Map<string, MemoryItem>();

function normalizeKey(key: string): string {
  const cleanKey = String(key || "").replace(/^:+/g, "");
  return `${keyPrefix}:${serviceName}:${cleanKey}`;
}

function isExpired(item: MemoryItem): boolean {
  return Boolean(item.expiresAt && item.expiresAt <= Date.now());
}

function getMemoryItem(key: string): MemoryItem | null {
  const item = memoryStore.get(key);
  if (!item) return null;
  if (isExpired(item)) {
    memoryStore.delete(key);
    return null;
  }
  return item;
}

const memoryRedis: RedisLike = {
  async get(key) {
    return getMemoryItem(normalizeKey(key))?.value ?? null;
  },
  async set(key, value, mode, ttl) {
    const expiresAt = mode === "EX" && ttl ? Date.now() + ttl * 1000 : 0;
    memoryStore.set(normalizeKey(key), { value, expiresAt });
    return "OK";
  },
  async del(key) {
    return memoryStore.delete(normalizeKey(key)) ? 1 : 0;
  },
  async incr(key) {
    const redisKey = normalizeKey(key);
    const item = getMemoryItem(redisKey);
    const next = (Number(item?.value || 0) || 0) + 1;
    memoryStore.set(redisKey, { value: String(next), expiresAt: item?.expiresAt || 0 });
    return next;
  },
  async expire(key, seconds) {
    const redisKey = normalizeKey(key);
    const item = getMemoryItem(redisKey);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    memoryStore.set(redisKey, item);
    return 1;
  },
  async ttl(key) {
    const item = getMemoryItem(normalizeKey(key));
    if (!item) return -2;
    if (!item.expiresAt) return -1;
    return Math.max(0, Math.ceil((item.expiresAt - Date.now()) / 1000));
  },
};

function hasRedisConfig(): boolean {
  return Boolean(
    process.env.REDIS_URL ||
      process.env.REDIS_HOST ||
      process.env.REDIS_PORT ||
      process.env.REDIS_USERNAME ||
      process.env.REDIS_PASSWORD ||
      process.env.REDIS_DB ||
      process.env.REDIS_TLS === "true" ||
      process.env.REDIS_ENABLED === "true"
  );
}

function createRedisClient(): Redis | null {
  if (process.env.REDIS_DISABLED === "true" || !hasRedisConfig()) return null;

  const options = {
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB || 0),
    tls: process.env.REDIS_TLS === "true" ? {} : undefined,
    lazyConnect: true,
    enableReadyCheck: false,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 2000),
    retryStrategy(times: number) {
      return times > 3 ? null : Math.min(times * 200, 1000);
    },
  };

  if (process.env.REDIS_URL) return new Redis(process.env.REDIS_URL, options);

  return new Redis({
    ...options,
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
  });
}

const redisClient = createRedisClient();
let redisErrorLogged = false;
let redisConnectPromise: Promise<void> | null = null;
let circuitOpenUntil = 0;
const circuitCooldownMs = Number(process.env.REDIS_CIRCUIT_COOLDOWN_MS || 15000);

async function ensureRedisReady(client: Redis): Promise<void> {
  if (client.status === "ready") return;
  if (!redisConnectPromise) {
    redisConnectPromise = client.connect().then(() => undefined).catch((error) => {
      redisConnectPromise = null;
      throw error;
    });
  }
  await redisConnectPromise;
}

async function withFallback<T>(operation: (client: Redis) => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  if (!redisClient) return fallback();
  if (Date.now() < circuitOpenUntil) return fallback();
  try {
    await ensureRedisReady(redisClient);
    const result = await operation(redisClient);
    circuitOpenUntil = 0;
    return result;
  } catch (error) {
    circuitOpenUntil = Date.now() + circuitCooldownMs;
    if (!redisErrorLogged) {
      redisErrorLogged = true;
      console.warn(`[Redis:${serviceName}] unavailable; using in-memory fallback.`, error instanceof Error ? error.name : "unknown error");
    }
    return fallback();
  }
}

const redis: RedisLike = {
  get(key) {
    return withFallback((client) => client.get(normalizeKey(key)), () => memoryRedis.get(key));
  },
  set(key, value, mode, ttl) {
    return withFallback(
      (client) => (mode === "EX" && ttl ? client.set(normalizeKey(key), value, "EX", ttl) : client.set(normalizeKey(key), value)),
      () => memoryRedis.set(key, value, mode, ttl)
    );
  },
  del(key) {
    return withFallback((client) => client.del(normalizeKey(key)), () => memoryRedis.del(key));
  },
  incr(key) {
    return withFallback((client) => client.incr(normalizeKey(key)), () => memoryRedis.incr(key));
  },
  expire(key, seconds) {
    return withFallback((client) => client.expire(normalizeKey(key), seconds), () => memoryRedis.expire(key, seconds));
  },
  ttl(key) {
    return withFallback((client) => client.ttl(normalizeKey(key)), () => memoryRedis.ttl(key));
  },
};

if (redisClient) {
  redisClient.on("connect", () => console.log(`[Redis:${serviceName}] connected.`));
  redisClient.on("error", (error) => {
    if (!redisErrorLogged) {
      redisErrorLogged = true;
      console.warn(`[Redis:${serviceName}] connection error; falling back to memory.`, error.name || "RedisError");
    }
  });
} else {
  console.log(`[Redis:${serviceName}] disabled or not configured; using in-memory fallback.`);
}

export default redis;
export type { RedisLike };
