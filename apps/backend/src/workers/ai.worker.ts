import { Worker, Job } from 'bullmq'
import { connection, QUEUE_NAMES } from '../lib/queue'
import { AiService } from '../modules/ai/ai.service'
import { FastifyInstance } from 'fastify'

export function startAIWorker(app: FastifyInstance): Worker {
  app.log.info('Starting AI Worker...')

  const worker = new Worker(
    QUEUE_NAMES.AI_TASKS,
    async (job: Job) => {
      const { userId, body, requestId } = job.data
      
      try {
        let result
        
        switch (job.name) {
          case 'parse-task':
            result = await AiService.parseTask(userId, body)
            break
          case 'extract-email':
            result = await AiService.extractEmail(userId, body)
            break
          case 'reschedule':
            result = await AiService.reschedule(userId, body)
            break
          case 'generate-routine':
            result = await AiService.generateRoutine(userId, body)
            break
          case 'omnibox':
            result = await AiService.processOmnibox(userId, body)
            break
          default:
            throw new Error(`Unknown job type: ${job.name}`)
        }
        
        app.log.info({ requestId, jobName: job.name, userId }, 'AI job completed successfully')
        return result
      } catch (error: any) {
        app.log.error({ requestId, jobName: job.name, userId, error }, 'AI job failed')
        throw error
      }
    },
    {
      connection: connection as any,
      concurrency: 2, // Limit concurrent AI operations to prevent CPU exhaustion
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    }
  )

  worker.on('completed', (job) => {
    app.log.info({ jobId: job.id, jobName: job.name }, 'AI job completed')
  })

  worker.on('failed', (job, err) => {
    app.log.error({ jobId: job?.id, jobName: job?.name, err }, 'AI job failed')
  })

  return worker
}