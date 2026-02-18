import { Redis } from "@upstash/redis";

// Upstash Redis クライアント（シングルトン）
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.warn(
      "Upstash Redis not configured. Caching disabled."
    );
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

/**
 * キャッシュ付きデータ取得
 * Redis が未設定の場合はキャッシュなしで fetcher を実行
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const client = getRedis();

  if (client) {
    try {
      const cached = await client.get<T>(key);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    } catch (error) {
      console.warn(`Cache read error for key ${key}:`, error);
    }
  }

  const fresh = await fetcher();

  if (client && fresh !== null && fresh !== undefined) {
    try {
      await client.set(key, fresh, { ex: ttlSeconds });
    } catch (error) {
      console.warn(`Cache write error for key ${key}:`, error);
    }
  }

  return fresh;
}

/**
 * キャッシュに直接値を設定
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.warn(`Cache set error for key ${key}:`, error);
  }
}

/**
 * キャッシュから値を取得
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    return await client.get<T>(key);
  } catch (error) {
    console.warn(`Cache get error for key ${key}:`, error);
    return null;
  }
}
