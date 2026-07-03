import type { FastifyPluginAsync } from 'fastify'
import { db } from '../../lib/db'
import { tasks, taskExternalMetadata } from '@verve/db'
import { eq, and, gte, lte, sql, asc } from '@verve/db'
import { redis } from '../../lib/redis'
import { CacheService } from '../../lib/cache'

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  // Add schema for better serialization and validation
  const DashboardSummarySchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          stats: {
            type: 'object',
            properties: {
              tasksCompleted: { type: 'number' },
              focusTimeMinutes: { type: 'number' },
              meetings: { type: 'number' }
            }
          },
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                status: { type: 'string' },
                priority: { type: 'string' },
                scheduled_at: { type: 'string', format: 'date-time' },
                estimated_duration_minutes: { type: 'number' },
                category: { type: 'string' },
                is_time_locked: { type: 'boolean' }
              }
            }
          }
        }
      },
      cached: { type: 'boolean' }
    }
  } as const

  app.get('/summary', { 
    preHandler: [app.authenticate],
    schema: {
      response: {
        200: DashboardSummarySchema
      }
    }
  }, async (req, reply) => {
    const user = req.user!
    const { date } = req.query as { date?: string }
    
    // Use provided date or default to today
    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))
    
    const cacheDate = startOfDay.toISOString().split('T')[0]
    const cacheKey = `dashboard:summary:${user.id}:${cacheDate}`
    
    // Try to get from multi-level cache first
    try {
      const cached = await CacheService.get(cacheKey)
      if (cached) {
        reply.header('Cache-Control', 'private, max-age=300')
        return reply.send({ success: true, data: cached, cached: true })
      }
    } catch (error) {
      app.log.warn({ err: error }, 'Dashboard cache read failed, continuing without cache')
    }
    
    // Optimized: Use parallel queries with database-level aggregation instead of JavaScript filtering
    const [stats, userTasks] = await Promise.all([
      // Single query with aggregation for stats
      db.select({
        tasksCompleted: sql<number>`count(*) filter (where ${tasks.status} = 'completed')`,
        focusTimeMinutes: sql<number>`coalesce(sum(${tasks.actual_duration_minutes}) filter (where ${tasks.status} = 'completed'), 0)`,
        meetings: sql<number>`count(*) filter (where ${taskExternalMetadata.external_provider} in ('zoom', 'google_calendar'))`
      })
      .from(tasks)
      .leftJoin(taskExternalMetadata, eq(tasks.id, taskExternalMetadata.task_id))
      .where(
        and(
          eq(tasks.user_id, user.id),
          gte(tasks.scheduled_at, startOfDay),
          lte(tasks.scheduled_at, endOfDay)
        )
      ),
      // Separate query for tasks with selective field projection
      db.select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        scheduled_at: tasks.scheduled_at,
        estimated_duration_minutes: tasks.estimated_duration_minutes,
        category: tasks.category,
        is_time_locked: tasks.is_time_locked,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.user_id, user.id),
          gte(tasks.scheduled_at, startOfDay),
          lte(tasks.scheduled_at, endOfDay)
        )
      )
      .orderBy(asc(tasks.scheduled_at))
    ])
    
    const responseData = {
      stats: stats[0],
      tasks: userTasks
    }
    
    // Cache for 5 minutes (300 seconds) with multi-level caching
    try {
      await CacheService.set(cacheKey, responseData, { 
        ttl: 300, 
        tags: [`user:${user.id}`, `dashboard:${user.id}`] 
      })
    } catch (error) {
      app.log.warn({ err: error }, 'Dashboard cache write failed')
    }
    
    // Set Cache-Control header
    reply.header('Cache-Control', 'private, max-age=300')
    return reply.send({ success: true, data: responseData, cached: false })
  })
}
