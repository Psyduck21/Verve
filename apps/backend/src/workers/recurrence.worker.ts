import { Worker, Job } from 'bullmq'
import { connection, QUEUE_NAMES } from '../lib/queue'
import { db } from '../lib/db'
import { tasks, taskRecurrences, routines, users } from '@verve/db'
import { eq, and, isNull, sql, inArray } from '@verve/db'
import { FastifyInstance } from 'fastify'
import { getRRule } from '../lib/lazyLoader'
import { TasksService } from '../modules/tasks/tasks.service'

export function startRecurrenceWorker(app: FastifyInstance): Worker {
  app.log.info('Starting Recurrence Worker...')

  const worker = new Worker(
    QUEUE_NAMES.NOTIFICATIONS, // We can reuse the notifications queue or create a new one. Since it's a cron, let's use the same worker pattern but process a different job name.
    async (job: Job) => {
      if (job.name === 'check-recurrences') {
        app.log.info('Cron triggered: Checking for recurring tasks...')
        
        let spawnedCount = 0
        const now = new Date()
        // Check for tasks in the next 2 hours (more precise with 15-minute intervals)
        const lookAhead = new Date(now.getTime() + 2 * 60 * 60 * 1000)
        
        // Optimized: Fetch all recurrences with user timezone in single query
        const activeRecurrences = await db
          .select({
            recurrence: taskRecurrences,
            task: tasks,
            user: users
          })
          .from(taskRecurrences)
          .innerJoin(tasks, eq(taskRecurrences.task_id, tasks.id))
          .innerJoin(users, eq(tasks.user_id, users.id))
          .where(isNull(tasks.deleted_at))
        
        if (activeRecurrences.length === 0) {
          return { success: true, spawnedCount: 0 }
        }

        // Optimized: Batch fetch existing spawns to avoid N+1 queries
        const parentIds = activeRecurrences.map(r => r.task.id)
        const existingSpawns = await db
          .select({ parent_task_id: tasks.parent_task_id, scheduled_at: tasks.scheduled_at })
          .from(tasks)
          .where(inArray(tasks.parent_task_id, parentIds))
        
        const spawnSet = new Set(
          existingSpawns
            .filter(s => s.scheduled_at !== null)
            .map(s => `${s.parent_task_id}-${s.scheduled_at!.toISOString()}`)
        )
        
        // Optimized: Cache parsed RRules to avoid repeated parsing
        const ruleCache = new Map<string, any>()
        let RRule
        try {
          RRule = await getRRule()
        } catch (err) {
          app.log.error({ err }, 'Failed to load RRule library')
          return { success: false, error: 'RRule library not available' }
        }
        
        if (!RRule || typeof RRule.fromString !== 'function') {
          app.log.error('RRule library is not properly loaded')
          return { success: false, error: 'RRule library not properly loaded' }
        }
        
        for (const record of activeRecurrences) {
          try {
            const ruleKey = record.recurrence.recurrence_rule
            
            // Use cached rule if available
            let rule = ruleCache.get(ruleKey)
            if (!rule) {
              rule = RRule.fromString(ruleKey)
              if (!rule || typeof rule.origOptions === 'undefined') {
                app.log.warn(`Invalid RRule string for task ${record.task.id}: ${ruleKey}`)
                continue
              }
              const options = rule.origOptions
              options.dtstart = record.task.scheduled_at || record.task.created_at
              // Set timezone to user's timezone for accurate occurrence calculation
              options.tzid = record.user.timezone || 'UTC'
              rule = new RRule(options)
              ruleCache.set(ruleKey, rule)
            }
            
            const nextDate = rule.after(now)

            // If the next occurrence is within the look-ahead window
            if (nextDate && nextDate <= lookAhead) {
              const spawnKey = `${record.task.id}-${nextDate.toISOString()}`
              
              // Check against set instead of querying database
              if (!spawnSet.has(spawnKey)) {
                app.log.info(`Spawning recurring task for ${record.task.title} at ${nextDate}`)
                
                // Spawn it using TasksService to ensure side-effects (like notifications) run
                await TasksService.createTask(record.task.user_id, {
                  title: record.task.title,
                  description: record.task.description,
                  priority: record.task.priority,
                  category: record.task.category,
                  estimated_duration_minutes: record.task.estimated_duration_minutes,
                  scheduled_at: nextDate,
                  routine_id: record.task.routine_id,
                  parent_task_id: record.task.id
                })
                
                spawnedCount++
              }
            }
          } catch (error) {
            app.log.error(`Error processing recurrence ${record.recurrence.id}: ${error}`)
          }
        }
        
        return { success: true, spawnedCount }
      }
    },
    {
      connection: connection as any,
      concurrency: 2, // Increased from 1 for better parallelism
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    }
  )

  worker.on('failed', (job, err) => {
    app.log.error({ jobId: job?.id, err }, 'Recurrence job failed')
  })

  return worker
}
