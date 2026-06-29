import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db'
import { users, tasks, routines, tombstones } from '@verve/db'
import { eq } from '@verve/db'
import { supabase } from '../../lib/supabase'

function deriveFullName(email: string, userMetadata: any) {
  return userMetadata?.full_name
    || userMetadata?.name
    || email.split('@')[0]
    || 'User'
}

const UpdatePreferencesSchema = z.object({
  full_name: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  grind_type: z.string().optional(),
  onboarding_completed: z.boolean().optional(),
  preferences: z.any().optional()
})

const WebhookSchema = z.object({
  event: z.string(),
  type: z.string(),
  record: z.object({
    id: z.string(),
    email: z.string(),
    created_at: z.string(),
    email_confirmed_at: z.string().nullable().optional(),
    user_metadata: z.any().optional(),
  }),
})

export const usersRoutes: FastifyPluginAsync = async (app) => {
  // POST /v1/users/webhook - Supabase auth webhook
  app.post('/webhook', async (req, reply) => {
    const parsed = WebhookSchema.safeParse(req.body)
    
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: 'Invalid webhook payload' })
    }

    const { event, record } = parsed.data

    // Handle user creation event
    if (event === 'user.created' || event === 'user.signed_up') {
      try {
        // Use insert with onConflictDoNothing to prevent race conditions
        // If the user already exists, this will do nothing (no error)
        const isVerified = !!record.email_confirmed_at;

        await db.insert(users).values({
          id: record.id,
          email: record.email,
          full_name: deriveFullName(record.email, record.user_metadata),
          email_verified: isVerified,
          onboarding_completed: false,
          onboarding_step: 0,
          ai_requests_used_today: 0,
        }).onConflictDoNothing({
          target: users.id, // Primary key constraint
        })
        
        console.log(`[Webhook] Processed user creation for ${record.email}`)
      } catch (error) {
        console.error('[Webhook] Error creating user:', error)
        // Don't fail the webhook response - Supabase will retry on error
      }
    }

    return reply.send({ success: true })
  })

  // GET /v1/users/profile
  app.get('/profile', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const profile = await db.select().from(users).where(eq(users.id, user.id))
    
    if (!profile.length) {
      return reply.status(404).send({ success: false, error: 'User not found' })
    }
    
    // Include AI quota information (limit is server-defined)
    const aiRequestLimit = 50
    const enrichedProfile = { ...profile[0], ai_request_limit: aiRequestLimit }
    return reply.send({ success: true, data: enrichedProfile })
  })

  // PUT /v1/users/preferences
  app.put('/preferences', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
    const user = req.user!
    const parsed = UpdatePreferencesSchema.safeParse(req.body)
    
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    const updated = await db.update(users)
      .set(parsed.data)
      .where(eq(users.id, user.id))
      .returning()

    return reply.send({ success: true, data: updated[0] })
  })

  // GET /v1/users/export
  app.get('/export', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!

    const userProfile = await db.select().from(users).where(eq(users.id, user.id))
    const userTasks = await db.select().from(tasks).where(eq(tasks.user_id, user.id))
    const userRoutines = await db.select().from(routines).where(eq(routines.user_id, user.id))

    const exportData = {
      profile: userProfile[0],
      tasks: userTasks,
      routines: userRoutines,
      exported_at: new Date().toISOString()
    }

    reply.header('Content-Disposition', 'attachment; filename="verve-data-export.json"')
    reply.type('application/json')
    return reply.send(exportData)
  })

  // DELETE /v1/users/me
  app.delete('/me', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
    const user = req.user!

    await db.transaction(async (tx) => {
      await tx.delete(tasks).where(eq(tasks.user_id, user.id))
      await tx.delete(routines).where(eq(routines.user_id, user.id))
      await tx.delete(tombstones).where(eq(tombstones.user_id, user.id))
      await tx.delete(users).where(eq(users.id, user.id))
    })

    // Remove auth cookie
    reply.clearCookie('verve_auth')
    return reply.send({ success: true, message: 'Account deleted successfully' })
  })
}
