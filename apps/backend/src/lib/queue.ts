import { Queue, Worker, QueueEvents, Job } from 'bullmq'
import Redis from 'ioredis'
import { FastifyInstance } from 'fastify'
import { RedisFallbackClient } from './redis-fallback'

// Support both REDIS_URL and UPSTASH_REDIS_URL for backward compatibility
const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL
const FALLBACK_ENABLED = process.env.REDIS_FALLBACK_ENABLED === 'true'
const FALLBACK_REDIS_URL = process.env.FALLBACK_REDIS_URL

if (!REDIS_URL) {
  console.warn('⚠️ Missing REDIS_URL for BullMQ. Queues will not function correctly without an ioredis-compatible connection string.')
}

// Create a reusable Redis connection for BullMQ
// Use fallback client if enabled, otherwise use direct Redis connection
let connection: Redis | RedisFallbackClient
let redisFallbackClient: RedisFallbackClient | null = null

if (FALLBACK_ENABLED && FALLBACK_REDIS_URL) {
  // Fallback will be initialized when the app starts with a logger instance
  // For now, create a placeholder that will be replaced
  connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
  })
} else {
  connection = REDIS_URL ? new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    // Suppress BullMQ eviction policy warnings for some Redis providers
    enableReadyCheck: false,
    enableOfflineQueue: false,
    lazyConnect: true,
    // Optimize connection to reduce request count
    connectTimeout: 10000,
    commandTimeout: 5000,
    retryStrategy: (times) => {
      if (times > 3) return null; // Give up after 3 retries
      return Math.min(times * 100, 3000);
    },
  }) : new Redis({ maxRetriesPerRequest: null, enableReadyCheck: false, enableOfflineQueue: false, lazyConnect: true })
}

// Initialize fallback client (call this when app starts)
export function initializeRedisFallback(logger: FastifyInstance): void {
  if (FALLBACK_ENABLED && FALLBACK_REDIS_URL) {
    try {
      const config = {
        primary: {
          url: REDIS_URL!,
          name: 'Primary Redis',
        },
        fallback: {
          url: FALLBACK_REDIS_URL,
          name: 'Fallback Redis',
        },
        healthCheckInterval: parseInt(process.env.REDIS_HEALTH_CHECK_INTERVAL || '30000'),
        circuitBreakerThreshold: parseInt(process.env.REDIS_CIRCUIT_BREAKER_THRESHOLD || '5'),
        circuitBreakerTimeout: parseInt(process.env.REDIS_CIRCUIT_BREAKER_TIMEOUT || '60000'),
        autoFailover: process.env.REDIS_AUTO_FAILOVER !== 'false',
      }
      redisFallbackClient = new RedisFallbackClient(config, logger)
      connection = redisFallbackClient
      logger.info('Redis fallback client initialized')
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Redis fallback client, using direct connection')
    }
  }
}

// Get the underlying Redis client for BullMQ compatibility
export function getRedisConnection(): Redis {
  if (connection instanceof RedisFallbackClient) {
    return connection.getClient()
  }
  return connection
}

// Get the fallback client instance for monitoring and management
export function getRedisFallbackClient(): RedisFallbackClient | null {
  return redisFallbackClient
}

// Export the connection for backward compatibility with workers
export { connection }

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications-queue',
  AI_TASKS: 'ai-tasks-queue',
} as const

// ── Queue Instances ───────────────────────────────────────────
// Initialize queues with placeholder connection - will be updated after fallback initialization
export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, { connection: getRedisConnection() as any })
export const aiTasksQueue = new Queue(QUEUE_NAMES.AI_TASKS, { connection: getRedisConnection() as any })

// ── Queue Events ──────────────────────────────────────────────
export const notificationQueueEvents = new QueueEvents(QUEUE_NAMES.NOTIFICATIONS, { connection: getRedisConnection() as any })
export const aiTasksQueueEvents = new QueueEvents(QUEUE_NAMES.AI_TASKS, { connection: getRedisConnection() as any })

// Update queue connections after fallback initialization
export function updateQueueConnections(): void {
  const redisConnection = getRedisConnection()
  
  // Close existing queues
  notificationQueue.close()
  aiTasksQueue.close()
  notificationQueueEvents.close()
  aiTasksQueueEvents.close()
  
  // Recreate with new connection
  const newNotificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, { connection: redisConnection as any })
  const newAiTasksQueue = new Queue(QUEUE_NAMES.AI_TASKS, { connection: redisConnection as any })
  const newNotificationQueueEvents = new QueueEvents(QUEUE_NAMES.NOTIFICATIONS, { connection: redisConnection as any })
  const newAiTasksQueueEvents = new QueueEvents(QUEUE_NAMES.AI_TASKS, { connection: redisConnection as any })
  
  // Update exports (this is a bit hacky but works for this use case)
  Object.assign(notificationQueue, newNotificationQueue)
  Object.assign(aiTasksQueue, newAiTasksQueue)
  Object.assign(notificationQueueEvents, newNotificationQueueEvents)
  Object.assign(aiTasksQueueEvents, newAiTasksQueueEvents)
}

// ── Graceful Shutdown ─────────────────────────────────────────
export function setupQueueShutdown(app: FastifyInstance, workers: Worker[]) {
  app.addHook('onClose', async () => {
    try {
      app.log.info('Shutting down BullMQ queues and workers...')
      
      const workerPromises = workers.map(worker => worker.close())
      await Promise.all([
        ...workerPromises,
        notificationQueue.close(),
        aiTasksQueue.close(),
        notificationQueueEvents.close(),
        aiTasksQueueEvents.close(),
      ])
      
      // Cleanup fallback client if it exists
      if (redisFallbackClient) {
        await redisFallbackClient.quit()
      }
      
      app.log.info('BullMQ shutdown complete.')
    } catch (err) {
      app.log.error({ err }, 'Error during BullMQ shutdown')
    }
  })
}
