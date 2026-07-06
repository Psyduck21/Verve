import { Worker, Job } from 'bullmq'
import { connection, notificationQueue, QUEUE_NAMES } from '../lib/queue'
import { db } from '../lib/db'
import { notificationSchedules, webPushSubscriptions } from '@verve/db'
import { eq, isNull, and, lte } from '@verve/db'
import { FastifyInstance } from 'fastify'
import webpush from 'web-push'
import { WORKER_CONSTANTS } from '../lib/constants'

export function startNotificationWorker(app: FastifyInstance): Worker {
  app.log.info('Starting Notification Worker...')

  const worker = new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job: Job) => {
      if (job.name === 'check-due-notifications') {
        app.log.info('Cron triggered: Checking for due notifications...')
        
        const now = new Date()
        const dueNotifications = await db
          .select({
            schedule: notificationSchedules,
            subscription: webPushSubscriptions
          })
          .from(notificationSchedules)
          .leftJoin(webPushSubscriptions, eq(notificationSchedules.subscription_id, webPushSubscriptions.id))
          .where(
            and(
              lte(notificationSchedules.scheduled_for, now),
              isNull(notificationSchedules.sent_at),
              isNull(notificationSchedules.failed_at),
              isNull(notificationSchedules.cancelled_at)
            )
          )

        let enqueued = 0
        for (const record of dueNotifications) {
          // Enqueue an individual job for each notification so they retry independently
          await notificationQueue.add('send-notification', record)
          enqueued++
        }
        return { success: true, checked: true, enqueued }
      }
      
      if (job.name === 'send-notification') {
        const { schedule, subscription } = job.data

        if (!subscription || !subscription.active) {
          await db.update(notificationSchedules)
            .set({ failed_at: new Date(), failure_reason: 'Subscription missing or inactive' })
            .where(eq(notificationSchedules.id, schedule.id))
          return { success: false, reason: 'Inactive subscription' }
        }

        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh_key, auth: subscription.auth_key }
        }

        const payload = JSON.stringify({
          title: schedule.title,
          body: schedule.body,
          icon: schedule.icon_url,
          url: schedule.action_url,
          data: schedule.payload
        })

        try {
          await webpush.sendNotification(pushSubscription, payload)
          await db.update(notificationSchedules)
            .set({ sent_at: new Date() })
            .where(eq(notificationSchedules.id, schedule.id))
          return { success: true, scheduleId: schedule.id }
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await db.update(webPushSubscriptions)
              .set({ active: false })
              .where(eq(webPushSubscriptions.id, subscription.id))
          }
          await db.update(notificationSchedules)
            .set({ failed_at: new Date(), failure_reason: error.message })
            .where(eq(notificationSchedules.id, schedule.id))
            
          throw error // Trigger BullMQ retry
        }
      }
    },
    {
      connection: connection as any,
      concurrency: WORKER_CONSTANTS.NOTIFICATION_WORKER_CONCURRENCY,
      removeOnComplete: { count: WORKER_CONSTANTS.JOB_CLEANUP_COMPLETE_COUNT },
      removeOnFail: { count: WORKER_CONSTANTS.JOB_CLEANUP_FAILED_COUNT },
    }
  )

  worker.on('failed', (job, err) => {
    app.log.error({ jobId: job?.id, err }, 'Notification job failed')
  })

  return worker
}
