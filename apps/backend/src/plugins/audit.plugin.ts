import fp from 'fastify-plugin'
import { db } from '../lib/db'
import { auditLog } from '@verve/db'

export const auditPlugin = fp(async (app) => {
  app.addHook('onResponse', async (request, reply) => {
    // Only log sensitive operations
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      return
    }
    
    // Check if the user is authenticated (using our custom auth plugin which adds user to request)
    const userId = request.user?.id
    
    // We can skip logging if there is no user attached (e.g., public endpoints, health checks)
    if (!userId) {
      return
    }

    try {
      await db.insert(auditLog).values({
        user_id: userId,
        // Optional session_id if available on req.user
        session_id: (request.user as any)?.session_id || null,
        event_type: `${request.method} ${request.routerPath || request.url}`,
        ip_address: request.ip || null,
        user_agent: request.headers['user-agent'] || null,
        success: reply.statusCode >= 200 && reply.statusCode < 400,
        metadata: {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          responseTime: reply.getResponseTime(),
          // Careful not to log sensitive body data directly without masking
          // For now, we omit the body to be safe, or just log query params
          query: request.query
        }
      })
    } catch (e) {
      app.log.error(e, 'Failed to write audit log')
    }
  })
})
