import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db'
import { routines, tasks, eq, and, isNull, sql } from '@verve/db'
import { redis } from '../../lib/redis'

const CreateRoutineSchema = z.object({
  title: z.string().min(1).max(200),
  goal: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  sort_order: z.number().optional(),
})

const UpdateRoutineSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  goal: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
  sort_order: z.number().optional(),
})

export const routinesRoutes: FastifyPluginAsync = async (app) => {
  // GET /v1/routines - List user's routines
  app.get('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { page = 1, limit = 50 } = req.query as { page?: string, limit?: string }
    const pageNum = Math.max(1, parseInt(String(page)) || 1)
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit)) || 50))
    const offsetNum = (pageNum - 1) * limitNum

    const cacheKey = `cache:routines:${user.id}:p${pageNum}:l${limitNum}`
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        reply.header('Cache-Control', 'private, max-age=300')
        return reply.send({ success: true, data: cached })
      }
    } catch (e) {
      app.log.warn({ err: e }, 'Redis cache read failed for routines')
    }


    const userRoutines = await db.select()
      .from(routines)
      .where(and(eq(routines.user_id, user.id), isNull(routines.deleted_at)))
      .orderBy(routines.sort_order)
      .limit(limitNum)
      .offset(offsetNum)

    // Get task count for each routine
    const routineIds = userRoutines.map(r => r.id)
    const taskCounts = routineIds.length > 0
      ? await db.select({ routine_id: tasks.routine_id, count: sql<number>`count(*)::int` })
          .from(tasks)
          .where(and(
            eq(tasks.user_id, user.id),
            isNull(tasks.deleted_at)
          ))
          .groupBy(tasks.routine_id)
      : []

    const countMap = new Map(taskCounts.map(tc => [tc.routine_id, Number(tc.count)]))

    const routinesWithCounts = userRoutines.map(routine => ({
      ...routine,
      task_count: countMap.get(routine.id) || 0,
    }))
    
    try {
      await redis.set(cacheKey, routinesWithCounts, { ex: 300 })
    } catch (e) {
      app.log.warn({ err: e }, 'Redis cache write failed for routines')
    }

    reply.header('Cache-Control', 'private, max-age=300')
    return reply.send({ success: true, data: routinesWithCounts })
  })

  // POST /v1/routines - Create routine
  app.post('/', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
    const user = req.user!
    const parsed = CreateRoutineSchema.safeParse(req.body)

    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    const { title, goal, is_active = true, is_default = false, sort_order } = parsed.data

    // If this is set as default, unset others
    if (is_default) {
      await db.update(routines)
        .set({ is_default: false })
        .where(eq(routines.user_id, user.id))
    }

    // Get max sort_order if not provided
    let finalSortOrder = sort_order
    if (sort_order === undefined) {
      const [maxOrder] = await db.select({ max: sql<number>`max(${routines.sort_order})` })
        .from(routines)
        .where(and(eq(routines.user_id, user.id), isNull(routines.deleted_at)))
      finalSortOrder = (maxOrder?.max || 0) + 1
    }

    const [newRoutine] = await db.insert(routines)
      .values({
        user_id: user.id,
        title,
        goal,
        is_active,
        is_default,
        sort_order: finalSortOrder,
      })
      .returning()

    return reply.send({ success: true, data: newRoutine })
  })

  // PUT /v1/routines/:id - Update routine
  app.put('/:id', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }
    const parsed = UpdateRoutineSchema.safeParse(req.body)

    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    const updates = parsed.data

    // Verify routine belongs to user
    const [existing] = await db.select()
      .from(routines)
      .where(and(eq(routines.id, id), eq(routines.user_id, user.id), isNull(routines.deleted_at)))

    if (!existing) {
      return reply.status(404).send({ success: false, error: 'Routine not found' })
    }

    // If this is set as default, unset others
    if (updates.is_default) {
      await db.update(routines)
        .set({ is_default: false })
        .where(and(eq(routines.user_id, user.id), sql`${routines.id} != ${id}`))
    }

    const [updated] = await db.update(routines)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(routines.id, id))
      .returning()

    return reply.send({ success: true, data: updated })
  })

  // DELETE /v1/routines/:id - Soft delete routine
  app.delete('/:id', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }

    // Verify routine belongs to user
    const [existing] = await db.select()
      .from(routines)
      .where(and(eq(routines.id, id), eq(routines.user_id, user.id), isNull(routines.deleted_at)))

    if (!existing) {
      return reply.status(404).send({ success: false, error: 'Routine not found' })
    }

    // Soft delete routine
    await db.update(routines)
      .set({ deleted_at: new Date() })
      .where(eq(routines.id, id))

    // Unlink tasks from this routine (set routine_id to null)
    await db.update(tasks)
      .set({ routine_id: null })
      .where(and(eq(tasks.routine_id, id), eq(tasks.user_id, user.id)))

    return reply.send({ success: true, message: 'Routine deleted' })
  })
}
