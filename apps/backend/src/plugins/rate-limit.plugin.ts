import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { redis } from '../lib/redis'

export const rateLimitPlugin = fp(async (app: FastifyInstance) => {
  await app.register(rateLimit, {
    max:        100,    // 100 requests per window per IP
    timeWindow: 60000,  // 1 minute window
    keyGenerator: (req: FastifyRequest) => {
      // Rate limit by session ID if available, fallback to IP
      const sessionId = (req as any).cookies?.['focal_session_id']
      return sessionId ? `rl:session:${sessionId}` : `rl:ip:${req.ip}`
    },
    errorResponseBuilder: () => {
      const err = new Error('Too many requests. Please slow down.') as any
      err.statusCode = 429
      err.code = 'RATE_LIMIT_EXCEEDED'
      return err
    }
  })
})
