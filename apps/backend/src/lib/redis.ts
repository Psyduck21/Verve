import { Redis } from '@upstash/redis'

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  throw new Error('Missing Upstash Redis env vars. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in apps/backend/.env.local')
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
  dashboardSummary: (userId: string, date: string | Date) => {
    const day = new Date(date).toISOString().split('T')[0]
    return `dashboard:summary:${userId}:${day}`
  },
  aiPromptCache:    (hash: string)      => `ai:cache:${hash}`,
  circuitBreaker:   ()                  => `ai:circuit:openrouter`,
  oauthNonce:       (nonce: string)     => `oauth:nonce:${nonce}`,
  aiRateLimit:      (userId: string, window: 'minute' | 'hour', endpoint: string) => 
    `ai:ratelimit:${userId}:${window}:${endpoint}`,
} as const
