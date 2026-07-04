import { redis } from './redis'

const LOCK_PREFIX = 'lock:'
const DEFAULT_TTL = 60000 // 1 minute

export async function acquireLock(lockKey: string, ttl: number = DEFAULT_TTL): Promise<boolean> {
  const fullKey = `${LOCK_PREFIX}${lockKey}`
  const result = await redis.set(fullKey, '1', { nx: true, px: ttl })
  return result === 'OK'
}

export async function releaseLock(lockKey: string): Promise<void> {
  const fullKey = `${LOCK_PREFIX}${lockKey}`
  await redis.del(fullKey)
}

export async function extendLock(lockKey: string, ttl: number = DEFAULT_TTL): Promise<boolean> {
  const fullKey = `${LOCK_PREFIX}${lockKey}`
  const result = await redis.expire(fullKey, ttl / 1000)
  return result === 1
}