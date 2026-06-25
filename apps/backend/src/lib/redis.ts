import { Redis } from '@upstash/redis'

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://mock-redis.upstash.io'
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'mock-token'

if (!process.env.UPSTASH_REDIS_REST_URL) {
  console.warn('⚠️ Missing UPSTASH_REDIS_REST_URL. Redis features (rate limiting, caching) will fail locally.')
}

export const redis = new Redis({
  url: UPSTASH_URL,
  token: UPSTASH_TOKEN,
})

// ── Key builders (centralized to avoid typos) ─────────────────
export const RedisKeys = {
  rateLimitSession: (sessionId: string) => `rl:session:${sessionId}`,
  rateLimitIp:      (ip: string)        => `rl:ip:${ip}`,
  aiDailyBudget:    (userId: string)    => `rl:ai:user:${userId}:daily`,
  syncLock:         (userId: string)    => `sync:lock:${userId}`,
  userCache:        (userId: string)    => `cache:user:${userId}`,
  weeklyReport:     (userId: string)    => `cache:weekly_report:${userId}`,
  aiPromptCache:    (hash: string)      => `ai:cache:${hash}`,
  circuitBreaker:   ()                  => `ai:circuit:openrouter`,
  oauthNonce:       (nonce: string)     => `oauth:nonce:${nonce}`,
} as const
