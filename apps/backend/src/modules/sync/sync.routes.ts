import type { FastifyPluginAsync } from 'fastify'
import { SyncPushRequestSchema, SyncPullRequestSchema } from '@verve/shared'
import { db } from '../../lib/db'
import { tasks, routines, taskCompletions, tombstones } from '@verve/db'
import { eq, gt, and } from '@verve/db'

export const syncRoutes: FastifyPluginAsync = async (app) => {

  // POST /v1/sync/push — Mobile pushes local mutations
  app.post('/push', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const body = SyncPushRequestSchema.parse(req.body)
    
    if (body.mutations.length > 500) {
      return reply.status(400).send({ success: false, error: 'Too many mutations. Max 500 per request.' })
    }

    try {
      // Process sequentially inside a transaction to ensure integrity
      await db.transaction(async (tx) => {
        for (const mutation of body.mutations) {
          const { table, operation, record } = mutation
          const rec = record as any

          if (operation === 'DELETE') {
            // Add tombstone
            await tx.insert(tombstones).values({
              user_id: user.id,
              table_name: table,
              record_id: rec.id,
              deleted_by_session_id: null,
            }).onConflictDoNothing()

            // Delete actual record
            if (table === 'tasks') await tx.delete(tasks).where(and(eq(tasks.id, rec.id), eq(tasks.user_id, user.id)))
            if (table === 'routines') await tx.delete(routines).where(and(eq(routines.id, rec.id), eq(routines.user_id, user.id)))
            if (table === 'task_completions') await tx.delete(taskCompletions).where(and(eq(taskCompletions.id, rec.id), eq(taskCompletions.user_id, user.id)))
          } else {
            // INSERT or UPDATE (upsert)
            if (table === 'tasks') {
              await tx.insert(tasks).values({ ...rec, user_id: user.id }).onConflictDoUpdate({ target: tasks.id, set: { ...rec, user_id: user.id, updated_at: new Date() }, where: eq(tasks.user_id, user.id) })
            }
            if (table === 'routines') {
              await tx.insert(routines).values({ ...rec, user_id: user.id }).onConflictDoUpdate({ target: routines.id, set: { ...rec, user_id: user.id, updated_at: new Date() }, where: eq(routines.user_id, user.id) })
            }
            if (table === 'task_completions') {
              await tx.insert(taskCompletions).values({ ...rec, user_id: user.id }).onConflictDoUpdate({ target: taskCompletions.id, set: { ...rec, user_id: user.id, updated_at: new Date() }, where: eq(taskCompletions.user_id, user.id) })
            }
          }
        }
      })

      app.log.info({ user: user.id, mutations: body.mutations.length }, 'Sync push applied')
      return reply.send({ success: true })
    } catch (error) {
      app.log.error({ err: error, user: user.id }, 'Sync push transaction failed')
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to apply sync mutations. Please try again.' 
      })
    }
  })

  // POST /v1/sync/pull — Mobile pulls server changes
  app.post('/pull', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const body = SyncPullRequestSchema.parse(req.body)
    const lastSynced = new Date(body.last_synced_at)

    const changes: Record<string, any[]> = {}
    
    if (body.tables.includes('tasks')) {
      changes.tasks = await db.select().from(tasks).where(and(eq(tasks.user_id, user.id), gt(tasks.updated_at, lastSynced)))
    }
    if (body.tables.includes('routines')) {
      changes.routines = await db.select().from(routines).where(and(eq(routines.user_id, user.id), gt(routines.updated_at, lastSynced)))
    }
    if (body.tables.includes('task_completions')) {
      changes.task_completions = await db.select().from(taskCompletions).where(and(eq(taskCompletions.user_id, user.id), gt(taskCompletions.updated_at, lastSynced)))
    }

    const tStones = await db.select().from(tombstones).where(and(eq(tombstones.user_id, user.id), gt(tombstones.deleted_at, lastSynced)))

    app.log.info({ user: user.id, last_synced_at: body.last_synced_at }, 'Sync pull dispatched')
    return reply.send({ success: true, data: { changes, tombstones: tStones, server_time: new Date().toISOString() } })
  })

  // GET /v1/sync/status — Health + server time
  app.get('/status', async (_req, reply) => {
    return reply.send({
      success: true,
      data: {
        status:      'ok',
        server_time: new Date().toISOString(),
      },
    })
  })

  // GET /v1/sync/powersync-token — Issues a JWT for PowerSync SDK
  app.get('/powersync-token', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    
    const POWERSYNC_PRIVATE_KEY = process.env.POWERSYNC_PRIVATE_KEY
    
    // Allow development mode without PowerSync for testing
    if (!POWERSYNC_PRIVATE_KEY && process.env.NODE_ENV === 'development') {
      return reply.status(503).send({ 
        success: false, 
        error: 'PowerSync not configured in development' 
      })
    }
    
    if (!POWERSYNC_PRIVATE_KEY) {
      return reply.status(500).send({ 
        success: false, 
        error: 'PowerSync private key not configured' 
      })
    }
    
    const jwt = require('jsonwebtoken')
    
    try {
      const token = jwt.sign(
        { user_id: user.id },
        POWERSYNC_PRIVATE_KEY,
        { algorithm: 'RS256', expiresIn: '5m' }
      )
      
      return reply.send({ token })
    } catch (e: any) {
      app.log.error({ err: e }, 'Failed to sign PowerSync token')
      return reply.status(500).send({ 
        success: false, 
        error: 'Failed to generate PowerSync token. Check RSA key configuration.' 
      })
    }
  })
}
