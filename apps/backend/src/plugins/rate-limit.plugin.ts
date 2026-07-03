import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { redis } from '../lib/redis'

export const rateLimitPlugin = fp(async (app: FastifyInstance) => {
  await app.register(rateLimit, {
    // We use a dynamic max function based on the user's role or plan
    max: (req: FastifyRequest) => {
      // Unauthenticated users
      if (!req.user) {
        return 50 // 50 requests per window
      }
      
      const plan = req.user.user_metadata?.plan || req.user.app_metadata?.plan || 'free'
      
      // Pro users get higher limits
      if (plan === 'pro' || plan === 'enterprise') {
        return 1000
      }
      
      // Free authenticated users
      return 200
    },
    timeWindow: 60000,  // 1 minute window
    keyGenerator: (req: FastifyRequest) => {
      if (req.user?.id) {
        return `rl:user:${req.user.id}`
      }
      const sessionId = (req as any).cookies?.['focal_session_id']
      return sessionId ? `rl:session:${sessionId}` : `rl:ip:${req.ip}`
    },
    errorResponseBuilder: () => {
      const err = new Error('Too many requests. Please upgrade your plan or slow down.') as any
      err.statusCode = 429
      err.code = 'RATE_LIMIT_EXCEEDED'
      return err
    }
  })
})
