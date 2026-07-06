export const RECURRENCE_CONSTANTS = {
  NOTIFICATION_ADVANCE_MINUTES: 15,
  RECURRENCE_LOOKAHEAD_HOURS: 2,
  RECURRENCE_CHECK_INTERVAL_MINUTES: 30, // Increased from 15 to 30 to reduce Redis usage
  MAX_RECURRENCE_RULE_LENGTH: 500,
  RRULE_PARSE_TIMEOUT_MS: 5000,
  DISTRIBUTED_LOCK_TTL_MS: 90000,
} as const

export const NOTIFICATION_CONSTANTS = {
  DEFAULT_SEND_TIMEOUT_MS: 10000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  CLEANUP_INTERVAL_HOURS: 24,
} as const

export const WORKER_CONSTANTS = {
  RECURRENCE_WORKER_CONCURRENCY: 1, // Reduced from 2 to lower Redis usage
  NOTIFICATION_WORKER_CONCURRENCY: 3, // Reduced from 5 to lower Redis usage
  AI_WORKER_CONCURRENCY: 1, // Reduced from 2 to lower Redis usage
  JOB_CLEANUP_COMPLETE_COUNT: 25, // Reduced from 100 to lower Redis memory usage
  JOB_CLEANUP_FAILED_COUNT: 50, // Reduced from 500 to lower Redis memory usage
} as const