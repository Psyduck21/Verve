import type { FastifyPluginAsync } from 'fastify'
import { RescheduleRequestSchema, GenerateRoutineRequestSchema, ExtractEmailRequestSchema, OmniboxRequestSchema, AssistantPlanRequestSchema, AssistantExecuteRequestSchema } from '@verve/shared'
import { AiService } from './ai.service'
import { AssistantService } from './assistant.service'
import { db } from '../../lib/db'
import { users } from '@verve/db'
import { eq } from '@verve/db'
import { aiRateLimiter } from '../../lib/aiRateLimiter'

// Rate limiting middleware factory
const withAIRateLimit = (endpoint: string) => {
  return async (req: any, reply: any) => {
    const user = req.user!
    const limitCheck = await aiRateLimiter.checkLimit(user.id, endpoint)

    if (!limitCheck.allowed) {
      reply.header('X-RateLimit-Limit', '5')
      reply.header('X-RateLimit-Remaining', '0')
      reply.header('X-RateLimit-Reset', String(Date.now() + (limitCheck.retryAfter || 60) * 1000))
      reply.header('Retry-After', String(limitCheck.retryAfter || 60))

      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many AI requests. Please try again later.',
          retryAfter: limitCheck.retryAfter
        }
      })
    }

    // Add rate limit headers for successful requests
    reply.header('X-RateLimit-Limit', '5')
    reply.header('X-RateLimit-Remaining', String(limitCheck.remaining || 0))
    reply.header('X-RateLimit-Reset', String(Date.now() + 60000))
  }
}

export const aiRoutes: FastifyPluginAsync = async (app) => {

  // POST /v1/ai/generate-routine
  app.post('/generate-routine', { preHandler: [app.authenticate, withAIRateLimit('generate-routine')] }, async (req, reply) => {
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
  app.post('/extract-email', { preHandler: [app.authenticate, withAIRateLimit('extract-email')] }, async (req, reply) => {
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
  app.post('/reschedule', { preHandler: [app.authenticate, withAIRateLimit('reschedule')] }, async (req, reply) => {
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
  app.post('/parse-task', { preHandler: [app.authenticate, withAIRateLimit('parse-task')] }, async (req, reply) => {
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
  app.post('/omnibox', { preHandler: [app.authenticate, withAIRateLimit('omnibox')] }, async (req, reply) => {
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

  app.post('/assistant/plan', { preHandler: [app.authenticate, withAIRateLimit('assistant-plan')] }, async (req, reply) => {
    const user = req.user!
    const body = AssistantPlanRequestSchema.parse(req.body)

    try {
      const data = await AssistantService.buildDraftPlan(user.id, body)
      return reply.send({ success: true, data })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ success: false, error: { code: 'AI_ERROR', message: error.message } })
    }
  })

  app.post('/assistant/execute', { preHandler: [app.authenticate, app.validateCSRF, withAIRateLimit('assistant-execute')] }, async (req, reply) => {
    const user = req.user!
    const body = AssistantExecuteRequestSchema.parse(req.body)

    try {
      const data = await AssistantService.executePlan(user.id, body)
      return reply.send({ success: true, data })
    } catch (error: any) {
      app.log.error(error)
      return reply.status(500).send({ success: false, error: { code: 'AI_ERROR', message: error.message } })
    }
  })

  // GET /v1/ai/usage
  app.get('/usage', { preHandler: [app.authenticate] }, async (req, reply) => {
    const dbUser = await db.query.users.findFirst({ where: eq(users.id, req.user!.id) })
    return reply.send({ success: true, data: { requests_used_today: dbUser?.ai_requests_used_today ?? 0, limit: 100 } })
  })
}
