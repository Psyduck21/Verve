import type { FastifyPluginAsync } from 'fastify'
import { db } from '../../lib/db'
import { tasks, taskExternalMetadata } from '@verve/db'
import { eq, and, gte, lte, count, sql, asc } from '@verve/db'
import { redis } from '../../lib/redis'

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/summary', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { date } = req.query as { date?: string }
    
    // Use provided date or default to today
    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))
    
    const cacheDate = startOfDay.toISOString().split('T')[0]
    const cacheKey = `dashboard:summary:${user.id}:${cacheDate}`
    
    // Try to get from cache first
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        reply.header('Cache-Control', 'private, max-age=300')
        return reply.send({ success: true, data: cached, cached: true })
      }
    } catch (error) {
      app.log.warn({ err: error }, 'Dashboard cache read failed, continuing without cache')
    }
    
    // Single query with JOIN to fetch tasks and count meetings, filtered by date
    const userTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        scheduled_at: tasks.scheduled_at,
        estimated_duration_minutes: tasks.estimated_duration_minutes,
        is_time_locked: tasks.is_time_locked,
        actual_duration_minutes: tasks.actual_duration_minutes,
        category: tasks.category,
        routine_id: tasks.routine_id,
        created_at: tasks.created_at,
        updated_at: tasks.updated_at,
        external_provider: taskExternalMetadata.external_provider,
      })
      .from(tasks)
      .leftJoin(taskExternalMetadata, eq(tasks.id, taskExternalMetadata.task_id))
      .where(
        and(
          eq(tasks.user_id, user.id),
          gte(tasks.scheduled_at, startOfDay),
          lte(tasks.scheduled_at, endOfDay)
        )
      )
      .orderBy(asc(tasks.scheduled_at))
    
    // Calculate basic stats from the joined result
    const tasksCompleted = userTasks.filter(t => t.status === 'completed').length
    const focusTimeMinutes = userTasks
      .filter(t => t.status === 'completed' && t.actual_duration_minutes)
      .reduce((acc, t) => acc + (t.actual_duration_minutes || 0), 0)
    
    // Calculate meetings from the joined result
    const meetings = userTasks.filter(t => 
      t.external_provider === 'zoom' || t.external_provider === 'google_calendar'
    ).length

    const responseData = {
      stats: {
        tasksCompleted,
        focusTimeMinutes,
        meetings
      },
      tasks: userTasks.map(({ external_provider, ...task }) => task)
    }
    
    // Cache for 5 minutes (300 seconds)
    try {
      await redis.set(cacheKey, responseData, { ex: 300 })
    } catch (error) {
      app.log.warn({ err: error }, 'Dashboard cache write failed')
    }
    
    // Set Cache-Control header
    reply.header('Cache-Control', 'private, max-age=300')
    return reply.send({ success: true, data: responseData, cached: false })
  })
}
