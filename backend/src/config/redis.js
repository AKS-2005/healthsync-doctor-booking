const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const redisUrl = process.env.REDIS_URL;
let redisClient;
let isRedisConnected = false;

// In-memory fallback map for non-redis development / testing if redis is unavailable
const memoryStore = new Map();
const memoryExpiries = new Map();

// Helper to clean up expired in-memory items
const checkMemoryExpiry = (key) => {
  if (memoryExpiries.has(key)) {
    const expireAt = memoryExpiries.get(key);
    if (Date.now() > expireAt) {
      memoryStore.delete(key);
      memoryExpiries.delete(key);
      return true;
    }
  }
  return false;
};

const createRedisClient = () => {
  const options = {
    retryStrategy(times) {
      if (times > 5) {
        console.warn('⚠️  Redis connection failed after 5 retries. Running in fallback mode.');
        return null; // Stop retrying to prevent unhandled rejections
      }
      return Math.min(times * 200, 2000);
    },
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
    lazyConnect: true,
  };

  const client = redisUrl
    ? new Redis(redisUrl, options)
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        ...options,
      });

  client.on('connect', () => {
    isRedisConnected = true;
    console.log('✅ Connected to Redis server successfully');
  });

  client.on('ready', () => {
    isRedisConnected = true;
  });

  client.on('error', (err) => {
    isRedisConnected = false;
    // Suppress repeated spam logs if Redis is not running locally
    if (err.code === 'ECONNREFUSED') {
      // handled quietly
    } else {
      console.warn('Redis warning:', err.message);
    }
  });

  client.on('close', () => {
    isRedisConnected = false;
  });

  // Attempt initial connect
  client.connect().catch((err) => {
    isRedisConnected = false;
    console.warn(`ℹ️  Redis not available at ${redisUrl || 'localhost:6379'}. Using in-memory fallback adapter for slot locks & caching.`);
  });

  return client;
};

redisClient = createRedisClient();

// High-level safe Redis API that abstracts Redis vs in-memory fallback
const safeRedis = {
  get isConnected() {
    return isRedisConnected;
  },

  get client() {
    return redisClient;
  },

  // Atomic SET NX EX (Key, Value, 'NX', 'EX', Seconds)
  async setNxEx(key, value, ttlSeconds) {
    if (isRedisConnected) {
      try {
        const result = await redisClient.set(key, value, 'NX', 'EX', ttlSeconds);
        return result === 'OK';
      } catch (err) {
        console.error('Redis setNxEx error:', err.message);
      }
    }

    // In-memory fallback implementation
    checkMemoryExpiry(key);
    if (memoryStore.has(key)) {
      return false;
    }
    memoryStore.set(key, value);
    memoryExpiries.set(key, Date.now() + ttlSeconds * 1000);
    return true;
  },

  // GET Key
  async get(key) {
    if (isRedisConnected) {
      try {
        return await redisClient.get(key);
      } catch (err) {
        console.error('Redis get error:', err.message);
      }
    }

    if (checkMemoryExpiry(key)) return null;
    return memoryStore.get(key) || null;
  },

  // SET Key with TTL
  async set(key, value, ttlSeconds) {
    if (isRedisConnected) {
      try {
        if (ttlSeconds) {
          await redisClient.set(key, value, 'EX', ttlSeconds);
        } else {
          await redisClient.set(key, value);
        }
        return true;
      } catch (err) {
        console.error('Redis set error:', err.message);
      }
    }

    memoryStore.set(key, value);
    if (ttlSeconds) {
      memoryExpiries.set(key, Date.now() + ttlSeconds * 1000);
    }
    return true;
  },

  // DEL Key
  async del(key) {
    if (isRedisConnected) {
      try {
        return await redisClient.del(key);
      } catch (err) {
        console.error('Redis del error:', err.message);
      }
    }

    memoryExpiries.delete(key);
    return memoryStore.delete(key) ? 1 : 0;
  },

  // GET TTL in seconds
  async ttl(key) {
    if (isRedisConnected) {
      try {
        return await redisClient.ttl(key);
      } catch (err) {
        console.error('Redis ttl error:', err.message);
      }
    }

    if (checkMemoryExpiry(key)) return -2;
    if (!memoryStore.has(key)) {
      return -2;
    }
    const expireAt = memoryExpiries.get(key);
    if (!expireAt) return -1;
    return Math.max(0, Math.floor((expireAt - Date.now()) / 1000));
  },

  // Atomic Lua release lock:
  // if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end
  async releaseLockWithLua(key, expectedToken) {
    if (isRedisConnected) {
      try {
        const luaScript = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        const result = await redisClient.eval(luaScript, 1, key, expectedToken);
        return result === 1;
      } catch (err) {
        console.error('Redis Lua eval error:', err.message);
      }
    }

    // In-memory atomic fallback
    if (checkMemoryExpiry(key)) return false;
    const currentVal = memoryStore.get(key);
    if (currentVal === expectedToken) {
      memoryStore.delete(key);
      memoryExpiries.delete(key);
      return true;
    }
    return false;
  },

  // Delete multiple keys by pattern
  async delByPattern(pattern) {
    if (isRedisConnected) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys && keys.length > 0) {
          await redisClient.del(...keys);
        }
        return true;
      } catch (err) {
        console.error('Redis delByPattern error:', err.message);
      }
    }

    // Memory store pattern delete
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const k of memoryStore.keys()) {
      if (regex.test(k)) {
        memoryStore.delete(k);
        memoryExpiries.delete(k);
      }
    }
    return true;
  },

  // Check health
  async ping() {
    if (isRedisConnected) {
      try {
        const pong = await redisClient.ping();
        return { connected: true, response: pong, mode: 'redis' };
      } catch (err) {
        return { connected: false, error: err.message, mode: 'fallback' };
      }
    }
    return { connected: true, response: 'PONG (in-memory fallback)', mode: 'fallback' };
  }
};

module.exports = {
  redisClient,
  safeRedis,
};
