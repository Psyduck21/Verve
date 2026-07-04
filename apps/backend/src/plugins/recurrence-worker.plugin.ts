import fp from 'fastify-plugin'
import { startRecurrenceWorker } from '../workers/recurrence.worker'
import { notificationQueue } from '../lib/queue'
import { setupQueueShutdown } from '../lib/queue'

export const recurrenceWorkerPlugin = fp(async (app) => {
  // Start the BullMQ worker
  const worker = startRecurrenceWorker(app)

  // Ensure graceful shutdown of the worker
  setupQueueShutdown(app, [worker])

  // Register a repeatable BullMQ job to act as the cron for checking recurrences
  // Run every 15 minutes to catch edge cases around time boundaries
  await notificationQueue.add(
    'check-recurrences',
    {},
    {
      repeat: {
        pattern: '*/15 * * * *', // Every 15 minutes
      },
      jobId: 'system-cron-check-recurrences', 
    }
  )

  app.log.info('Recurrence Worker (BullMQ) initialized.')
})
