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
  await notificationQueue.add(
    'check-recurrences',
    {},
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
      jobId: 'system-cron-check-recurrences', 
    }
  )

  app.log.info('Recurrence Worker (BullMQ) initialized.')
})
