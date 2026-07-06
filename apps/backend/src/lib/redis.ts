import Redis from 'ioredis'

// Support both Valkey and Upstash Redis URLs
const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL

if (!REDIS_URL) {
  throw new Error('Missing Redis URL. Set REDIS_URL or UPSTASH_REDIS_URL in apps/backend/.env.local')
}

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  lazyConnect: true,
  connectTimeout: 15000, // Increased for SSL connections
  commandTimeout: 15000, // Increased for SSL connections
  tls: {}, // Enable TLS for rediss:// URLs
  keepAlive: 30000, // Keep connections alive
  retryStrategy: (times) => {
    if (times > 2) return null; // Reduce retries for faster fallback
    return Math.min(times * 200, 2000);
  },
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
