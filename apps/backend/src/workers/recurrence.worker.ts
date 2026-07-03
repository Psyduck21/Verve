import { Worker, Job } from 'bullmq'
import { connection, QUEUE_NAMES } from '../lib/queue'
import { db } from '../lib/db'
import { tasks, taskRecurrences, routines } from '@verve/db'
import { eq, and, isNull, sql } from '@verve/db'
import { FastifyInstance } from 'fastify'
import { RRule } from 'rrule'
import { TasksService } from '../modules/tasks/tasks.service'

export function startRecurrenceWorker(app: FastifyInstance): Worker {
  app.log.info('Starting Recurrence Worker...')

  const worker = new Worker(
    QUEUE_NAMES.NOTIFICATIONS, // We can reuse the notifications queue or create a new one. Since it's a cron, let's use the same worker pattern but process a different job name.
    async (job: Job) => {
      if (job.name === 'check-recurrences') {
        app.log.info('Cron triggered: Checking for recurring tasks...')
        
        const activeRecurrences = await db
          .select({
            recurrence: taskRecurrences,
            task: tasks
          })
          .from(taskRecurrences)
          .innerJoin(tasks, eq(taskRecurrences.task_id, tasks.id))
          .where(isNull(tasks.deleted_at))

        let spawnedCount = 0
        const now = new Date()
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

        for (const record of activeRecurrences) {
          try {
            const rule = RRule.fromString(record.recurrence.recurrence_rule)
            // Use the original task's scheduled_at as the start date, or created_at if not set
            const dtstart = record.task.scheduled_at || record.task.created_at
            
            // Set the start date for the rule
            const options = rule.origOptions
            options.dtstart = dtstart
            const activeRule = new RRule(options)

            // Find the next occurrence after today
            const nextDate = activeRule.after(now)

            // If the next occurrence is within the next 24 hours
            if (nextDate && nextDate <= tomorrow) {
              // Check if a spawn already exists for this exact date
              const existingSpawn = await db
                .select({ id: tasks.id })
                .from(tasks)
                .where(
                  and(
                    eq(tasks.parent_task_id, record.task.id),
                    eq(tasks.scheduled_at, nextDate)
                  )
                )
                .limit(1)

              if (existingSpawn.length === 0) {
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
      concurrency: 1, 
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    }
  )

  worker.on('failed', (job, err) => {
    app.log.error({ jobId: job?.id, err }, 'Recurrence job failed')
  })

  return worker
}
