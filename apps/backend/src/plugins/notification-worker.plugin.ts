import fp from 'fastify-plugin'
import webpush from 'web-push'
import { startNotificationWorker } from '../workers/notification.worker'
import { notificationQueue } from '../lib/queue'
import { setupQueueShutdown } from '../lib/queue'

export const notificationWorkerPlugin = fp(async (app) => {
  // Initialize web-push with VAPID keys
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@verve.app'

  if (!publicKey || !privateKey) {
    app.log.warn('VAPID keys not configured. Push Notification worker will NOT start.')
    return
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  // Start the BullMQ worker
  const worker = startNotificationWorker(app)

  // Ensure graceful shutdown of the worker and queue connections
  setupQueueShutdown(app, [worker])

  // Instead of setInterval, we register a repeatable BullMQ job to act as the cron
  // This guarantees only ONE worker globally runs the check loop
  await notificationQueue.add(
    'check-due-notifications',
    {},
    {
      repeat: {
        pattern: '*/5 * * * *', // Every 5 minutes (reduced from every minute to lower Redis usage)
      },
      jobId: 'system-cron-check-due-notifications', // Static ID ensures only one repeatable job exists
    }
  )

  app.log.info('Push Notification Worker (BullMQ) initialized.')
})
