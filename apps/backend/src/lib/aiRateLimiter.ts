import { redis, RedisKeys } from './redis'
import { db } from './db'
import { users } from '@verve/db'
import { eq } from '@verve/db'

interface AIRateLimitConfig {
  maxRequests: number
  windowMs: number
}

// Rate limits per user tier
const RATE_LIMITS = {
  free: {
    perMinute: 5,      // 5 requests per minute
    perHour: 30,       // 30 requests per hour
  },
  pro: {
    perMinute: 20,     // 20 requests per minute
    perHour: 200,      // 200 requests per hour
  },
  enterprise: {
    perMinute: 100,    // 100 requests per minute
    perHour: 1000,     // 1000 requests per hour
  },
}

// Cache user plan for 5 minutes to avoid repeated DB queries
async function getUserPlan(userId: string): Promise<string> {
  const cacheKey = RedisKeys.userCache(userId)
  const cached = await redis.hget(cacheKey, 'plan')
  
  if (cached) {
    return cached as string
  }
  
  const user = await db.select({ plan: users.plan }).from(users).where(eq(users.id, userId)).then(res => res[0])
  const plan = user?.plan || 'free'
  
  // Cache for 5 minutes
  await redis.hset(cacheKey, { plan })
  await redis.expire(cacheKey, 300)
  
  return plan
}

export class AIRateLimiter {
  async checkLimit(
    userId: string,
    endpoint: string
  ): Promise<{ allowed: boolean; retryAfter?: number; remaining?: number }> {
    const userPlan = await getUserPlan(userId)
    const limits = RATE_LIMITS[userPlan as keyof typeof RATE_LIMITS] || RATE_LIMITS.free
    
    const minuteKey = RedisKeys.aiRateLimit(userId, 'minute', endpoint)
    const hourKey = RedisKeys.aiRateLimit(userId, 'hour', endpoint)
    
    const now = Date.now()
    
    // Check minute limit
    const minuteCount = await redis.incr(minuteKey)
    if (minuteCount === 1) {
      await redis.expire(minuteKey, 60) // 60 seconds
    }
    
    if (minuteCount > limits.perMinute) {
      const ttl = await redis.ttl(minuteKey)
      return { allowed: false, retryAfter: ttl }
    }
    
    // Check hour limit
    const hourCount = await redis.incr(hourKey)
    if (hourCount === 1) {
      await redis.expire(hourKey, 3600) // 1 hour
    }
    
    if (hourCount > limits.perHour) {
      const ttl = await redis.ttl(hourKey)
      return { allowed: false, retryAfter: ttl }
    }
    
    return { allowed: true, remaining: limits.perMinute - minuteCount }
  }
}

export const aiRateLimiter = new AIRateLimiter()
