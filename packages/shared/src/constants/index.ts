// ── Priority weights (Constraint Engine) ─────────────────────
export const PRIORITY_WEIGHTS = {
  critical: 4,
  high:     3,
  medium:   2,
  low:      1,
} as const

// ── AI Budget Limits per plan ─────────────────────────────────
export const AI_DAILY_LIMITS = {
  free:       5,
  pro:        100,
  enterprise: Infinity,
} as const

// ── Constraint Engine limits ──────────────────────────────────
export const ENGINE_LIMITS = {
  MAX_TASKS_PER_DAY:     30,     // Bounded array for O(n²) safety
  MAX_CASCADE_LOOPS:     2000,   // Stress-tested against 50 overlapping tasks
  DAY_START_HOUR:        8,      // Spillover resets to 08:00
  DAY_END_HOUR:          23,     // Tasks past 23:59 roll to next day
  SPILLOVER_BUFFER_MINS: 5,      // Gap between spilled task and day start
} as const

// ── Sync settings ─────────────────────────────────────────────
export const SYNC_CONFIG = {
  CONTEXT_WINDOW_DAYS_PAST:   15,    // AI sees 15 days back
  CONTEXT_WINDOW_DAYS_FUTURE: 15,    // AI sees 15 days forward
  TOMBSTONE_TTL_DAYS:         90,    // Tombstones expire after 90 days
  PUSH_MAX_BATCH_SIZE:        500,   // Max mutations per push
  CONFLICT_TOLERANCE_SECS:    5,     // ±5s clock drift tolerance
  SYNC_LOCK_TTL_SECS:         30,    // Redis distributed lock duration
} as const

// ── Rate Limiting ─────────────────────────────────────────────
export const RATE_LIMITS = {
  REQUESTS_PER_MINUTE:  100,    // Per session
  AI_BUDGET_RESET_HOUR: 0,      // Midnight UTC reset
} as const

// ── Stripe price IDs (replace with your actual Stripe IDs) ────
export const STRIPE_PRICE_IDS = {
  PRO_MONTHLY:    'price_pro_monthly_placeholder',
  PRO_YEARLY:     'price_pro_yearly_placeholder',
} as const

// ── AI Model routing ──────────────────────────────────────────
export const AI_MODEL_ROUTES = {
  generate_routine:  [
    'google/gemini-2.5-flash',
    'anthropic/claude-3-5-haiku',
    'openai/gpt-4o-mini',
  ],
  extract_questions: [
    'meta-llama/llama-3.1-8b-instruct',
    'google/gemini-2.5-flash-lite',
  ],
  reschedule: [
    'google/gemini-2.5-flash-lite',
    'meta-llama/llama-3.1-8b-instruct',
    'google/gemini-2.0-flash',
  ],
} as const

// ── Error codes ───────────────────────────────────────────────
export const ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS:  'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_NOT_VERIFIED:   'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_SESSION_EXPIRED:      'AUTH_SESSION_EXPIRED',
  AUTH_SESSION_REVOKED:      'AUTH_SESSION_REVOKED',
  AUTH_CSRF_INVALID:         'AUTH_CSRF_INVALID',
  RATE_LIMIT_EXCEEDED:       'RATE_LIMIT_EXCEEDED',
  AI_BUDGET_EXCEEDED:        'AI_BUDGET_EXCEEDED',
  AI_SERVICE_UNAVAILABLE:    'AI_SERVICE_UNAVAILABLE',
  SYNC_LOCK_CONFLICT:        'SYNC_LOCK_CONFLICT',
  SYNC_CONFLICT:             'SYNC_CONFLICT',
  SYNC_INVALID_PAYLOAD:      'SYNC_INVALID_PAYLOAD',
  NOT_FOUND:                 'NOT_FOUND',
  PLAN_REQUIRED:             'PLAN_REQUIRED',
  INTERNAL_ERROR:            'INTERNAL_ERROR',
} as const

export type ErrorCode = keyof typeof ERROR_CODES

// ── App metadata ──────────────────────────────────────────────
export const APP_CONFIG = {
  NAME:     'Focal',
  TAGLINE:  'Your day, in focus.',
  API_VERSION: 'v1',
  BASE_URL: 'https://focal.app',
  API_URL:  'https://api.focal.app',
} as const
