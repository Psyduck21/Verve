import type { FastifyPluginAsync } from 'fastify'
import { db } from '../../lib/db'
import { tasks } from '@verve/db'
import { eq, and, gte, sql } from '@verve/db'

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/ingest',         async (_, r) => r.status(501).send({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Coming in Phase 6' } }))
  
  app.get('/weekly-report', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    
    // Get last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    // Aggregate tasks completed per day
    const completedTasks = await db
      .select({
        day: sql<string>`to_char(${tasks.updated_at}, 'Dy')`,
        date: sql<string>`to_char(${tasks.updated_at}, 'YYYY-MM-DD')`,
        tasks: sql<number>`count(*)::integer`
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.user_id, user.id),
          eq(tasks.status, 'completed'),
          gte(tasks.updated_at, sevenDaysAgo)
        )
      )
      .groupBy(sql`to_char(${tasks.updated_at}, 'Dy'), to_char(${tasks.updated_at}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${tasks.updated_at}, 'YYYY-MM-DD')`)

    // We can also calculate focus hours by summing actual_duration_minutes
    // For now, we format it as WEEKLY_DATA format required by the frontend
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    
    const reportData = daysOfWeek.map(dayName => {
      const found = completedTasks.find(t => t.day === dayName)
      return {
        name: dayName,
        tasks: found ? found.tasks : 0
      }
    })

    return reply.send({ success: true, data: { weekly_tasks: reportData } })
  })

  app.get('/trends',          async (_, r) => r.status(501).send({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Coming in Phase 6' } }))
  app.get('/heatmap',         async (_, r) => r.status(501).send({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Coming in Phase 6' } }))
  app.get('/streaks',         async (_, r) => r.status(501).send({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Coming in Phase 6' } }))
}
