import type { FastifyPluginAsync } from 'fastify'
import { RescheduleRequestSchema, GenerateRoutineRequestSchema, ExtractEmailRequestSchema, OmniboxRequestSchema } from '@verve/shared'
import { AiService } from './ai.service'
import { db } from '../../lib/db'
import { users } from '@verve/db'
import { eq } from '@verve/db'

export const aiRoutes: FastifyPluginAsync = async (app) => {

  // POST /v1/ai/generate-routine
  app.post('/generate-routine', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const body = GenerateRoutineRequestSchema.parse(req.body)

    try {
      const data = await AiService.generateRoutine(user.id, body)
      return reply.send({ success: true, data })
    } catch (error: any) {
      if (error.message === 'Daily AI budget exceeded') {
        return reply.status(429).send({ success: false, error: { code: 'RATE_LIMIT', message: error.message } })
      }
      app.log.error(error)
      return reply.status(500).send({ success: false, error: { code: 'AI_ERROR', message: error.message } })
    }
  })

  // POST /v1/ai/extract-email
  app.post('/extract-email', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const body = ExtractEmailRequestSchema.parse(req.body)

    try {
      const data = await AiService.extractEmail(user.id, body)
      return reply.send({ success: true, data })
    } catch (error: any) {
      if (error.message === 'Daily AI budget exceeded') {
        return reply.status(429).send({ success: false, error: { code: 'RATE_LIMIT', message: error.message } })
      }
      app.log.error(error)
      return reply.status(500).send({ success: false, error: { code: 'AI_ERROR', message: error.message } })
    }
  })

  // POST /v1/ai/reschedule
  app.post('/reschedule', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const body = RescheduleRequestSchema.parse(req.body)

    try {
      const data = await AiService.reschedule(user.id, body)
      return reply.send({ success: true, data })
    } catch (error: any) {
      if (error.message === 'Daily AI budget exceeded') {
        return reply.status(429).send({ success: false, error: { code: 'RATE_LIMIT', message: error.message } })
      }
      if (error.message.includes('invalid task_id')) {
        return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: error.message } })
      }
      app.log.error(error)
      return reply.status(500).send({ success: false, error: { code: 'AI_ERROR', message: error.message } })
    }
  })

  // POST /v1/ai/parse-task
  app.post('/parse-task', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { ParseTaskRequestSchema } = await import('@verve/shared')
    const body = ParseTaskRequestSchema.parse(req.body)

    try {
      const data = await AiService.parseTask(user.id, body)
      return reply.send({ success: true, data })
    } catch (error: any) {
      if (error.message === 'Daily AI budget exceeded') {
        return reply.status(429).send({ success: false, error: { code: 'RATE_LIMIT', message: error.message } })
      }
      app.log.error(error)
      return reply.status(500).send({ success: false, error: { code: 'AI_ERROR', message: error.message } })
    }
  })

  // POST /v1/ai/omnibox
  app.post('/omnibox', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const body = OmniboxRequestSchema.parse(req.body)

    try {
      const data = await AiService.processOmnibox(user.id, body)
      return reply.send({ success: true, data })
    } catch (error: any) {
      if (error.message === 'Daily AI budget exceeded') {
        return reply.status(429).send({ success: false, error: { code: 'RATE_LIMIT', message: error.message } })
      }
      app.log.error(error)
      return reply.status(500).send({ success: false, error: { code: 'AI_ERROR', message: error.message } })
    }
  })

  // GET /v1/ai/usage
  app.get('/usage', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const dbUser = await db.select({ ai_requests: users.ai_requests_used_today }).from(users).where(eq(users.id, user.id)).then(res => res[0])
    return reply.send({ success: true, data: { requests_used_today: dbUser?.ai_requests ?? 0, limit: 50 } })
  })
}
