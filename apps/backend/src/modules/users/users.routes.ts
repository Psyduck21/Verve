import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db'
import { users, tasks, routines, tombstones } from '@verve/db'
import { eq } from '@verve/db'

const UpdatePreferencesSchema = z.object({
  full_name: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  grind_type: z.string().optional(),
  onboarding_completed: z.boolean().optional(),
  preferences: z.any().optional()
})

export const usersRoutes: FastifyPluginAsync = async (app) => {
  // GET /v1/users/profile
  app.get('/profile', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const profile = await db.select().from(users).where(eq(users.id, user.id))
    
    if (!profile.length) {
      return reply.status(404).send({ success: false, error: 'User not found' })
    }
    
    return reply.send({ success: true, data: profile[0] })
  })

  // PUT /v1/users/preferences
  app.put('/preferences', { preHandler: [app.authenticate] }, async (req, reply) => {
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
  app.delete('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
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
