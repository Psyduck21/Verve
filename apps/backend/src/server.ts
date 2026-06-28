import { startTelemetry } from './lib/telemetry'
startTelemetry()

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'OPENROUTER_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  // 'POWERSYNC_PRIVATE_KEY',
]

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
if (process.env.NODE_ENV === 'production' && !process.env.SENTRY_DSN) {
  console.warn('⚠️ SENTRY_DSN is not set. Error tracking will be disabled.')
}

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
}

// Validate RSA key format for PowerSync
function validateRSAPrivateKey(key: string): boolean {
  try {
    // RSA private keys start with -----BEGIN PRIVATE KEY----- or -----BEGIN RSA PRIVATE KEY-----
    return key.includes('-----BEGIN') && key.includes('PRIVATE KEY')
  } catch {
    return false
  }
}

if (process.env.POWERSYNC_PRIVATE_KEY) {
  if (!validateRSAPrivateKey(process.env.POWERSYNC_PRIVATE_KEY)) {
    throw new Error('POWERSYNC_PRIVATE_KEY must be a valid RSA private key in PEM format')
  }
}

import Fastify from 'fastify'
import * as Sentry from '@sentry/node'
import fastifyCookie from '@fastify/cookie'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import { corsPlugin } from './plugins/cors.plugin'
import { helmetPlugin } from './plugins/helmet.plugin'
import { rateLimitPlugin } from './plugins/rate-limit.plugin'
import { errorHandler } from './plugins/error-handler.plugin'
import authPlugin from './plugins/auth.plugin'
import csrfPlugin from './plugins/csrf.plugin'
import { auditPlugin } from './plugins/audit.plugin'
import { notificationWorkerPlugin } from './plugins/notification-worker.plugin'
import { db } from './lib/db'
import { redis } from './lib/redis'
import { sql } from '@verve/db'
// import { authRoutes }        from './modules/auth/auth.routes'
import { syncRoutes } from './modules/sync/sync.routes'
import { aiRoutes } from './modules/ai/ai.routes'
import { analyticsRoutes } from './modules/analytics/analytics.routes'
import { dashboardRoutes } from './modules/dashboard/dashboard.routes'
import { tasksRoutes } from './modules/tasks/tasks.routes'
import { notifRoutes } from './modules/notifications/notifications.routes'
import { billingRoutes } from './modules/billing/billing.routes'
import { integrationsRoutes } from './modules/integrations/integrations.routes'
import { googleRoutes } from './modules/integrations/google.routes'
import { usersRoutes } from './modules/users/users.routes'
import { adminRoutes } from './modules/admin/admin.routes'
import { categoriesRoutes } from './modules/categories/categories.routes'
import { onboardingRoutes } from './modules/onboarding/onboarding.routes'
import { timeblocksRoutes } from './modules/timeblocks/timeblocks.routes'
import { templatesRoutes } from './modules/templates/templates.routes'
import { routinesRoutes } from './modules/routines/routines.routes'

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  tracesSampleRate: 1.0,
})

// The port must fallback to process.env.PORT for Render deployment compatibility
const PORT = parseInt(process.env.PORT || process.env.API_PORT || '3001', 10)

async function bootstrap() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport: process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
    trustProxy: true,  // Required behind Cloudflare / Railway proxy
  })

  // ── Global plugins ────────────────────────────────────────
  await app.register(helmetPlugin)
  await app.register(fastifyCookie)
  await app.register(csrfPlugin)
  await app.register(corsPlugin)
  await app.register(rateLimitPlugin)
  await app.register(authPlugin)
  await app.register(auditPlugin)
  await app.register(notificationWorkerPlugin)

  // ── Swagger API Documentation ─────────────────────────────
  await app.register(swagger, {
    swagger: {
      info: {
        title: 'Verve API',
        description: 'Verve backend API documentation',
        version: '1.0.0',
      },
      host: 'localhost:3001',
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
    }
  })
  
  await app.register(swaggerUI, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  })

  // ── Global error handler ──────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    Sentry.captureException(error)
    errorHandler(error, request, reply)
  })

  // ── Health check (no auth) ────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    service: 'verve-backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
  }))

    // ── CSRF token endpoint (no auth) ─────────────────────────
    // Provides a one-time CSRF token for clients to include in mutation requests
    app.get('/v1/csrf-token', async (request, reply) => {
      // The @fastify/csrf-protection plugin exposes `reply.generateCsrf()`
      const token = await reply.generateCsrf()
      return reply.send({ success: true, csrfToken: token })
    })

  // ── Comprehensive health check with dependencies ─────────────
  app.get('/health/detailed', async (request, reply) => {
    const health = {
      status: 'ok' as 'ok' | 'degraded' | 'down',
      service: 'verve-backend',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
      dependencies: {
        database: { status: 'ok' as 'ok' | 'down', latency: 0 },
        redis: { status: 'ok' as 'ok' | 'down', latency: 0 },
        ai: { status: 'ok' as 'ok' | 'down', latency: 0 },
      },
    }

    let hasFailures = false

    // Check database
    try {
      const start = Date.now()
      await db.execute(sql`SELECT 1`)
      health.dependencies.database.latency = Date.now() - start
    } catch (error) {
      health.dependencies.database.status = 'down'
      hasFailures = true
    }

    // Check Redis
    try {
      const start = Date.now()
      await redis.ping()
      health.dependencies.redis.latency = Date.now() - start
    } catch (error) {
      health.dependencies.redis.status = 'down'
      hasFailures = true
    }

    // Check AI (OpenRouter)
    try {
      const start = Date.now()
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })
      health.dependencies.ai.latency = Date.now() - start
      
      if (!response.ok) {
        health.dependencies.ai.status = 'down'
        hasFailures = true
      }
    } catch (error) {
      health.dependencies.ai.status = 'down'
      hasFailures = true
    }

    // Set overall status
    if (hasFailures) {
      health.status = 'degraded'
    }

    const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503
    return reply.status(statusCode).send(health)
  })

  // ── Domain routes ─────────────────────────────────────────
  // await app.register(authRoutes, { prefix: '/v1/auth' })
  await app.register(syncRoutes, { prefix: '/v1/sync' })
  await app.register(aiRoutes, { prefix: '/v1/ai' })
  await app.register(analyticsRoutes, { prefix: '/v1/analytics' })
  await app.register(dashboardRoutes, { prefix: '/v1/dashboard' })
  await app.register(tasksRoutes, { prefix: '/v1/tasks' })
  await app.register(timeblocksRoutes, { prefix: '/v1/timeblocks' })
  await app.register(templatesRoutes, { prefix: '/v1/templates' })
  await app.register(notifRoutes, { prefix: '/v1/notifications' })
  await app.register(billingRoutes, { prefix: '/v1/billing' })
  await app.register(integrationsRoutes, { prefix: '/v1/integrations' })
  await app.register(googleRoutes, { prefix: '/v1/integrations/google' })
  await app.register(usersRoutes, { prefix: '/v1/users' })
  await app.register(adminRoutes, { prefix: '/v1/admin' })
  await app.register(categoriesRoutes, { prefix: '/v1/categories' })
  await app.register(onboardingRoutes, { prefix: '/v1/onboarding' })
  await app.register(routinesRoutes, { prefix: '/v1/routines' })

  // ── Start ─────────────────────────────────────────────────
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' })
    app.log.info(`🚀 Verve backend running on port ${PORT}`)

    // Verify Redis connectivity on boot so we know Upstash is actually reachable.
    try {
      const start = Date.now()
      await redis.ping()
      app.log.info({ latencyMs: Date.now() - start }, '✅ Upstash Redis connected')
    } catch (error) {
      app.log.warn({ err: error }, '⚠️ Upstash Redis ping failed')
    }
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

bootstrap()
