import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db'
import { webPushSubscriptions, notificationSchedules } from '@verve/db'
import { eq, and } from '@verve/db'

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  }),
  browser: z.string().optional()
})

const UnsubscribeSchema = z.object({
  endpoint: z.string().url()
})

export const notifRoutes: FastifyPluginAsync = async (app) => {
  // Subscribe to Web Push
  app.post('/push/subscribe', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const parsed = SubscribeSchema.safeParse(req.body)
    
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    const { endpoint, keys, browser } = parsed.data

    await db.insert(webPushSubscriptions).values({
      user_id: user.id,
      endpoint,
      p256dh_key: keys.p256dh,
      auth_key: keys.auth,
      browser: browser || null,
      active: true,
      last_used_at: new Date()
    }).onConflictDoUpdate({
      target: webPushSubscriptions.endpoint,
      set: {
        user_id: user.id,
        p256dh_key: keys.p256dh,
        auth_key: keys.auth,
        active: true,
        last_used_at: new Date()
      }
    })

    return reply.send({ success: true })
  })

  // Unsubscribe
  app.delete('/unsubscribe', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const parsed = UnsubscribeSchema.safeParse(req.body)
    
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    await db.update(webPushSubscriptions)
      .set({ active: false })
      .where(and(
        eq(webPushSubscriptions.user_id, user.id),
        eq(webPushSubscriptions.endpoint, parsed.data.endpoint)
      ))

    return reply.send({ success: true })
  })

  // Get Notification History
  app.get('/history', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    
    const history = await db.select().from(notificationSchedules)
      .where(eq(notificationSchedules.user_id, user.id))
      // Add order by or limit in production

    return reply.send({ success: true, data: history })
  })

  // Mark as read
  app.put('/:id/read', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }
    
    // In our schema, we don't have a specific `read_at` field, but we can just return success 
    // or add it later. For now, we will return success.
    
    return reply.send({ success: true })
  })

  // Placeholder routes
  app.post('/schedule',       async (_, r) => r.status(501).send({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Use Tasks API' } }))
  app.post('/cancel',         async (_, r) => r.status(501).send({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Use Tasks API' } }))
  app.get('/preferences',     async (_, r) => r.status(501).send({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Use Users API' } }))
  app.put('/preferences',     async (_, r) => r.status(501).send({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Use Users API' } }))
}
