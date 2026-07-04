import { Worker, Job } from 'bullmq'
import { connection, QUEUE_NAMES } from '../lib/queue'
import { db } from '../lib/db'
import { tasks, taskRecurrences, routines, users } from '@verve/db'
import { eq, and, isNull, sql, inArray } from '@verve/db'
import { FastifyInstance } from 'fastify'
import { getRRule } from '../lib/lazyLoader'
import { TasksService } from '../modules/tasks/tasks.service'
import { acquireLock, releaseLock } from '../lib/distributedLock'
import { RECURRENCE_CONSTANTS, WORKER_CONSTANTS } from '../lib/constants'

export function startRecurrenceWorker(app: FastifyInstance): Worker {
  app.log.info('Starting Recurrence Worker...')

  const worker = new Worker(
    QUEUE_NAMES.NOTIFICATIONS, // We can reuse the notifications queue or create a new one. Since it's a cron, let's use the same worker pattern but process a different job name.
    async (job: Job) => {
      if (job.name === 'check-recurrences') {
        let spawnedCount = 0
        const now = new Date()
        
        // Implement distributed locking to prevent concurrent checks
        const lockKey = `recurrence:check:${now.toISOString().split('T')[0]}:${Math.floor(now.getHours() / 4)}`
        const acquired = await acquireLock(lockKey, RECURRENCE_CONSTANTS.DISTRIBUTED_LOCK_TTL_MS)

        if (!acquired) {
          app.log.info('Recurrence check already in progress, skipping')
          return { success: true, skipped: true }
        }

        try {
          app.log.info('Cron triggered: Checking for recurring tasks...')
          
          const processingStartTime = Date.now()
          
          // Check for tasks in the next 2 hours (more precise with 15-minute intervals)
          const lookAhead = new Date(now.getTime() + RECURRENCE_CONSTANTS.RECURRENCE_LOOKAHEAD_HOURS * 60 * 60 * 1000)
        
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
          const ruleCache = new Map<string, { rule: any; options: any; createdAt: Date }>()
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
              const cachedRule = ruleCache.get(ruleKey)
              if (!cachedRule) {
                const parsedRule = RRule.fromString(ruleKey)
                if (!parsedRule || typeof parsedRule.origOptions === 'undefined') {
                  app.log.warn(`Invalid RRule string for task ${record.task.id}: ${ruleKey}`)
                  continue
                }
                const options = parsedRule.origOptions
                options.dtstart = record.task.scheduled_at || record.task.created_at
                // Set timezone to user's timezone for accurate occurrence calculation
                options.tzid = record.user.timezone || 'UTC'
                const finalRule = new RRule(options)
                
                ruleCache.set(ruleKey, {
                  rule: finalRule,
                  options,
                  createdAt: new Date()
                })
              }
            
              const rule = cachedRule ? cachedRule.rule : ruleCache.get(ruleKey)!.rule
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
              app.log.error({
                recurrenceId: record.recurrence.id,
                taskId: record.task.id,
                userId: record.task.user_id,
                rule: record.recurrence.recurrence_rule,
                error: error instanceof Error ? error.message : String(error)
              }, `Error processing recurrence`)
            }
          }
        
          const processingTime = Date.now() - processingStartTime
          
          return { 
            success: true, 
            spawnedCount,
            totalProcessed: activeRecurrences.length,
            processingTime
          }
        } finally {
          await releaseLock(lockKey)
        }
      }
    },
    {
      connection: connection as any,
      concurrency: WORKER_CONSTANTS.RECURRENCE_WORKER_CONCURRENCY,
      removeOnComplete: { count: WORKER_CONSTANTS.JOB_CLEANUP_COMPLETE_COUNT },
      removeOnFail: { count: WORKER_CONSTANTS.JOB_CLEANUP_FAILED_COUNT },
    }
  )

  worker.on('failed', (job, err) => {
    app.log.error({ jobId: job?.id, err }, 'Recurrence job failed')
  })

  return worker
}
