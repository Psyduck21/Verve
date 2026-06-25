import type { FastifyPluginAsync } from 'fastify'
import { db } from '../../lib/db'
import { users, aiRequestLog, routines, tasks } from '@verve/db'
import { eq, desc, count } from '@verve/db'

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Middleware to ensure user is superadmin
  app.addHook('preHandler', async (req, reply) => {
    // In a real app, this would check a role or specific email list
    const user = req.user!
    const dbUser = await db.select().from(users).where(eq(users.id, user.id)).then(r => r[0])
    
    // Hardcoded for demonstration - only allow specific emails to access admin routes
    if (!dbUser || !dbUser.email.endsWith('@verve.app')) {
      return reply.code(403).send({ error: 'Forbidden: Superadmin only' })
    }
  })

  // GET /v1/admin/stats
  // Global platform statistics
  app.get('/stats', async (req, reply) => {
    const totalUsers = await db.select({ count: count() }).from(users).then(r => r[0].count)
    const totalTasks = await db.select({ count: count() }).from(tasks).then(r => r[0].count)
    const totalRoutines = await db.select({ count: count() }).from(routines).then(r => r[0].count)
    
    const recentAiLogs = await db.select()
      .from(aiRequestLog)
      .orderBy(desc(aiRequestLog.created_at))
      .limit(10)

    return reply.send({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          tasks: totalTasks,
          routines: totalRoutines
        },
        recentAiUsage: recentAiLogs
      }
    })
  })

  // POST /v1/admin/impersonate
  // Returns an access token for another user for support debugging
  app.post('/impersonate', async (req, reply) => {
    const { target_user_id } = req.body as { target_user_id: string }
    
    const targetUser = await db.select().from(users).where(eq(users.id, target_user_id)).then(r => r[0])
    if (!targetUser) {
      return reply.code(404).send({ error: 'User not found' })
    }

    // In a production app with Supabase Auth, you might need to use the Supabase Admin API 
    // or generate a custom JWT if you're using a custom auth flow.
    // For now, this is a conceptual endpoint.
    return reply.send({
      success: true,
      message: `Impersonation initiated for ${targetUser.email}`,
      data: { user: targetUser }
    })
  })
}
