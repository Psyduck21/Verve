import { Queue, Worker, QueueEvents, Job } from 'bullmq'
import Redis from 'ioredis'
import { FastifyInstance } from 'fastify'

// Ensure we have a standard Redis URL (starts with redis:// or rediss://)
// Note: UPSTASH_REDIS_REST_URL is HTTP based, we need UPSTASH_REDIS_URL for ioredis
const REDIS_URL = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL

if (!REDIS_URL) {
  console.warn('⚠️ Missing UPSTASH_REDIS_URL for BullMQ. Queues will not function correctly without an ioredis-compatible connection string.')
}

// Create a reusable Redis connection for BullMQ
export const connection = REDIS_URL ? new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  // Suppress BullMQ eviction policy warnings for Upstash Redis
  // Upstash uses 'optimistic-volatile' which is acceptable for their managed service
  enableReadyCheck: false,
}) : new Redis({ maxRetriesPerRequest: null, enableReadyCheck: false })

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications-queue',
  AI_TASKS: 'ai-tasks-queue',
} as const

// ── Queue Instances ───────────────────────────────────────────
export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, { connection: connection as any })
export const aiTasksQueue = new Queue(QUEUE_NAMES.AI_TASKS, { connection: connection as any })

// ── Queue Events ──────────────────────────────────────────────
export const notificationQueueEvents = new QueueEvents(QUEUE_NAMES.NOTIFICATIONS, { connection: connection as any })
export const aiTasksQueueEvents = new QueueEvents(QUEUE_NAMES.AI_TASKS, { connection: connection as any })

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
      
      app.log.info('BullMQ shutdown complete.')
    } catch (err) {
      app.log.error({ err }, 'Error during BullMQ shutdown')
    }
  })
}
