import Redis from "ioredis";

// Redis-Client (Singleton)
let redisClient: Redis | null = null;
let redisAvailable = true;

function getRedisClient(): Redis | null {
  if (!redisAvailable) return null;
  
  if (!redisClient && process.env.REDIS_URL) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            redisAvailable = false;
            console.warn("[RateLimit] Redis nicht verfügbar, verwende In-Memory Fallback");
            return null;
          }
          return Math.min(times * 100, 1000);
        },
        lazyConnect: true,
      });
      
      redisClient.on("error", (err) => {
        console.warn("[RateLimit] Redis Fehler:", err.message);
        redisAvailable = false;
      });
    } catch {
      redisAvailable = false;
    }
  }
  
  return redisClient;
}

// In-Memory Fallback (für Entwicklung oder wenn Redis nicht verfügbar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate-Limit mit Redis (mit In-Memory Fallback)
export async function rateLimitAsync(
  key: string,
  limit: number = 5,
  windowMs: number = 60000
): Promise<{ success: boolean; remaining: number; resetIn: number }> {
  const redis = getRedisClient();
  
  if (redis && redisAvailable) {
    try {
      const redisKey = `ratelimit:${key}`;
      const windowSec = Math.ceil(windowMs / 1000);
      
      // Lua-Script für atomare Rate-Limiting-Operation
      const luaScript = `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        
        local current = redis.call('GET', key)
        if current == false then
          redis.call('SET', key, 1, 'EX', window)
          return {1, limit - 1, window * 1000}
        end
        
        local count = tonumber(current)
        if count >= limit then
          local ttl = redis.call('TTL', key)
          return {0, 0, ttl * 1000}
        end
        
        redis.call('INCR', key)
        local ttl = redis.call('TTL', key)
        return {1, limit - count - 1, ttl * 1000}
      `;
      
      const result = await redis.eval(luaScript, 1, redisKey, limit, windowSec) as number[];
      
      return {
        success: result[0] === 1,
        remaining: result[1],
        resetIn: result[2],
      };
    } catch (err) {
      console.warn("[RateLimit] Redis-Fehler, verwende In-Memory:", err);
      redisAvailable = false;
    }
  }
  
  // In-Memory Fallback
  return rateLimit(key, limit, windowMs);
}

// Synchrone In-Memory Rate-Limiting (für Abwärtskompatibilität)
export function rateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 60000
): { success: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (record.count >= limit) {
    const resetIn = record.resetTime - now;
    return { success: false, remaining: 0, resetIn };
  }

  record.count++;
  return { 
    success: true, 
    remaining: limit - record.count, 
    resetIn: record.resetTime - now 
  };
}

export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}

// Cleanup-Interval für In-Memory Map
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

// Redis-Verbindung schließen (für Graceful Shutdown)
export async function closeRateLimitRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Status prüfen
export function isRedisAvailable(): boolean {
  return redisAvailable && !!process.env.REDIS_URL;
}
