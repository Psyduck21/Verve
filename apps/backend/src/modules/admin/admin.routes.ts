import type { FastifyPluginAsync } from 'fastify'
import { db } from '../../lib/db'
import { users, aiRequestLog, auditLog, routines, tasks } from '@verve/db'
import { eq, desc, count } from '@verve/db'

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Middleware to ensure user is superadmin
  app.addHook('preHandler', async (req, reply) => {
    // In a real app, this would check a role or specific email list
    const user = req.user!
    const dbUser = await db.select().from(users).where(eq(users.id, user.id)).then(r => r[0])
    
    // Check if user has superadmin role
    if (!dbUser || dbUser.role !== 'superadmin') {
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

  // GET /v1/admin/logs/summary
  // Compact monitoring feed: success/error status only, no raw metadata payloads.
  app.get('/logs/summary', async (req, reply) => {
    const { limit: rawLimit } = req.query as { limit?: string }
    const limit = Math.min(Math.max(Number(rawLimit) || 25, 1), 100)

    const [aiLogs, auditLogs] = await Promise.all([
      db.select({
        id: aiRequestLog.id,
        success: aiRequestLog.success,
        error_code: aiRequestLog.error_code,
        created_at: aiRequestLog.created_at,
        request_type: aiRequestLog.request_type,
      })
        .from(aiRequestLog)
        .orderBy(desc(aiRequestLog.created_at))
        .limit(limit),
      db.select({
        id: auditLog.id,
        success: auditLog.success,
        event_type: auditLog.event_type,
        created_at: auditLog.created_at,
      })
        .from(auditLog)
        .orderBy(desc(auditLog.created_at))
        .limit(limit),
    ])

    const rows = [
      ...aiLogs.map((log) => ({
        id: log.id,
        type: 'ai_request' as const,
        status: log.success ? 'success' : 'error',
        success: log.success,
        error_code: log.error_code,
        event_type: log.request_type,
        created_at: log.created_at,
      })),
      ...auditLogs.map((log) => ({
        id: log.id,
        type: 'audit' as const,
        status: log.success ? 'success' : 'error',
        success: log.success,
        error_code: log.success ? null : 'REQUEST_FAILED',
        event_type: log.event_type,
        created_at: log.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)

    return reply.send({ success: true, data: rows })
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
