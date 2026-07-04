import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { register } from '../lib/metrics'

export const metricsPlugin: FastifyPluginAsync = fp(async (app) => {
  // Expose Prometheus metrics endpoint
  app.get('/metrics', async (req, reply) => {
    reply.type('text/plain')
    return reply.send(await register.metrics())
  })
  
  // Add metrics hook to track all requests
  app.addHook('onResponse', async (request, reply) => {
    const { trackHttpRequest } = await import('../lib/metrics')
    const duration = reply.elapsedTime
    trackHttpRequest(
      request.method,
      request.routeOptions.url || request.routerPath,
      reply.statusCode,
      duration
    )
  })
})