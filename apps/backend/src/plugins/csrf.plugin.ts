import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import csrf from '@fastify/csrf-protection'

declare module 'fastify' {
  interface FastifyInstance {
    validateCSRF: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const csrfPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(csrf, {
    cookieOpts: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    },
  })

  // Decorate instance with CSRF validation middleware for mutation endpoints
  fastify.decorate('validateCSRF', async (request: FastifyRequest, reply: FastifyReply) => {
    fastify.log.debug({
      csrfHeader: request.headers['x-csrf-token'],
      cookie: request.headers.cookie,
      method: request.method,
      url: request.url,
      env: process.env.NODE_ENV,
    }, 'CSRF validation request')

    if (process.env.NODE_ENV !== 'production') {
      fastify.log.debug('Skipping CSRF validation in development mode')
      return
    }

    // Get CSRF token from header or body
    const token = request.headers['x-csrf-token'] as string || (request.body as any)?.csrf_token
    
    if (!token) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token is required for this request'
        }
      })
    }

    // Delegate to the csrf-protection plugin's validator (ensures token matches secret cookie)
    // The plugin registers `fastify.csrfProtection` which acts as a preHandler
    try {
      const protector = (fastify as any).csrfProtection
      if (typeof protector === 'function') {
        // call the plugin's protection handler to perform validation
        await new Promise<void>((resolve, reject) => {
          // protector may expect (request, reply, done) or return a promise
          try {
            const maybePromise = protector(request, reply, (err: any) => {
              if (err) return reject(err)
              resolve()
            })

            if (maybePromise && typeof maybePromise.then === 'function') {
              maybePromise.then(() => resolve()).catch(reject)
            }
          } catch (err) {
            reject(err)
          }
        })
      } else {
        // If protector not available, allow request to continue (plugin not loaded?)
      }
    } catch (err: any) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'CSRF_VALIDATION_FAILED',
          message: err?.message || 'Invalid CSRF token'
        }
      })
    }
  })
}

export default fp(csrfPlugin)
