import fp from 'fastify-plugin'
import webpush from 'web-push'
import { db } from '../lib/db'
import { notificationSchedules, webPushSubscriptions } from '@verve/db'
import { eq, isNull, and, lte } from '@verve/db'

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

  app.log.info('Push Notification Worker initialized.')

  const checkNotifications = async () => {
    try {
      // Find due notifications
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

      for (const record of dueNotifications) {
        const { schedule, subscription } = record

        if (!subscription || !subscription.active) {
          // Mark as failed if subscription doesn't exist or is inactive
          await db.update(notificationSchedules)
            .set({ failed_at: new Date(), failure_reason: 'Subscription missing or inactive' })
            .where(eq(notificationSchedules.id, schedule.id))
          continue
        }

        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
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
          
          // Mark as sent
          await db.update(notificationSchedules)
            .set({ sent_at: new Date() })
            .where(eq(notificationSchedules.id, schedule.id))
            
        } catch (error: any) {
          // If the endpoint is gone (410/404), we should mark the subscription as inactive
          if (error.statusCode === 410 || error.statusCode === 404) {
            await db.update(webPushSubscriptions)
              .set({ active: false })
              .where(eq(webPushSubscriptions.id, subscription.id))
          }

          // Mark notification as failed
          await db.update(notificationSchedules)
            .set({ failed_at: new Date(), failure_reason: error.message })
            .where(eq(notificationSchedules.id, schedule.id))
            
          app.log.error(`Failed to send push notification ${schedule.id}: ${error.message}`)
        }
      }
    } catch (error) {
      app.log.error(error, 'Error in push notification worker loop')
    }
  }

  // Run every 60 seconds
  const intervalId = setInterval(checkNotifications, 60000)

  // Run once on startup
  setTimeout(checkNotifications, 5000)

  // Cleanup on close
  app.addHook('onClose', (instance, done) => {
    clearInterval(intervalId)
    done()
  })
})
