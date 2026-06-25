import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { TasksService, CreateSubtaskSchema } from './tasks.service'
import { sanitizeHtml } from '../../lib/sanitize'
import { db } from '../../lib/db'
import { tasks } from '@verve/db'
import { eq, desc, lt, gt, and } from '@verve/db'

const CreateTaskSchema = z.object({
  routine_id: z.string().uuid().optional(),
  title: z.string(),
  description: z.string().optional().nullable(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'missed', 'cancelled']).optional(),
  category: z.string().optional().nullable(),
  scheduled_at: z.string().datetime({ offset: true }).or(z.date()),
  estimated_duration_minutes: z.number().optional(),
})

const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
})

const UpdateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'missed', 'cancelled']).optional(),
  category: z.string().optional().nullable(),
  scheduled_at: z.string().datetime({ offset: true }).or(z.date()).optional(),
  estimated_duration_minutes: z.number().optional(),
  actual_duration_minutes: z.number().optional().nullable(),
})

export const tasksRoutes: FastifyPluginAsync = async (app) => {
  // LIST TASKS (with pagination)
  app.get('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    
    const parsed = PaginationSchema.safeParse(req.query)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }
    
    const { cursor, limit } = parsed.data
    
    // Build query with cursor-based pagination
    const conditions = [eq(tasks.user_id, user.id)]
    if (cursor) {
      conditions.push(lt(tasks.scheduled_at, new Date(cursor)))
    }
    
    const results = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.scheduled_at))
      .limit(limit + 1) // Fetch one extra to determine if there's a next page
    
    const hasMore = results.length > limit
    const taskList = hasMore ? results.slice(0, -1) : results
    const nextCursor = hasMore ? taskList[taskList.length - 1].scheduled_at?.toISOString() : null
    
    return reply.send({
      success: true,
      data: taskList,
      pagination: {
        nextCursor,
        hasMore,
        limit,
      }
    })
  })

  // CREATE TASK
  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    
    const parsed = CreateTaskSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }
    
    // Sanitize description to prevent XSS
    const sanitizedData = {
      ...parsed.data,
      description: parsed.data.description ? sanitizeHtml(parsed.data.description) : null,
    }
    
    try {
      const task = await TasksService.createTask(user.id, sanitizedData)
      return reply.status(201).send({ success: true, data: task })
    } catch (e: any) {
      if (e.message.includes('Invalid routine_id')) {
        return reply.status(403).send({ success: false, error: e.message })
      }
      throw e
    }
  })

  // UPDATE TASK
  app.put('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }
    
    const parsed = UpdateTaskSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }
    
    // Sanitize description to prevent XSS
    const sanitizedData = {
      ...parsed.data,
      description: parsed.data.description ? sanitizeHtml(parsed.data.description) : null,
    }
    
    try {
      const task = await TasksService.updateTask(user.id, id, sanitizedData)
      return reply.send({ success: true, data: task })
    } catch (e: any) {
      if (e.message.includes('Task not found')) {
        return reply.status(404).send({ success: false, error: e.message })
      }
      throw e
    }
  })

  // DELETE TASK
  app.delete('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }

    try {
      const task = await TasksService.deleteTask(user.id, id)
      return reply.send({ success: true, data: task })
    } catch (e: any) {
      if (e.message.includes('Task not found')) {
        return reply.status(404).send({ success: false, error: e.message })
      }
      throw e
    }
  })

  // CREATE SUBTASK
  app.post('/:id/subtasks', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }

    const parsed = CreateSubtaskSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    try {
      const subtask = await TasksService.createSubtask(user.id, id, parsed.data)
      return reply.status(201).send({ success: true, data: subtask })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create subtask'
      return reply.status(400).send({ success: false, error: message })
    }
  })

  // LIST SUBTASKS
  app.get('/:id/subtasks', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }

    try {
      const subtasks = await TasksService.listSubtasks(user.id, id)
      return reply.send({ success: true, data: subtasks })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list subtasks'
      return reply.status(404).send({ success: false, error: message })
    }
  })

  // UPDATE SUBTASK
  app.put('/:id/subtasks/:subtaskId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id, subtaskId } = req.params as { id: string; subtaskId: string }

    const parsed = CreateSubtaskSchema.partial().safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    try {
      const subtask = await TasksService.updateSubtask(user.id, subtaskId, parsed.data)
      return reply.send({ success: true, data: subtask })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update subtask'
      return reply.status(400).send({ success: false, error: message })
    }
  })

  // DELETE SUBTASK
  app.delete('/:id/subtasks/:subtaskId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id, subtaskId } = req.params as { id: string; subtaskId: string }

    try {
      await TasksService.deleteSubtask(user.id, subtaskId)
      return reply.send({ success: true, message: 'Subtask deleted' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete subtask'
      return reply.status(404).send({ success: false, error: message })
    }
  })

  // REORDER SUBTASKS
  app.post('/:id/subtasks/reorder', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }
    const { subtaskIds } = req.body as { subtaskIds: string[] }

    if (!Array.isArray(subtaskIds)) {
      return reply.status(400).send({ success: false, error: 'subtaskIds must be an array' })
    }

    try {
      await TasksService.reorderSubtasks(user.id, id, subtaskIds)
      return reply.send({ success: true, message: 'Subtasks reordered' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reorder subtasks'
      return reply.status(400).send({ success: false, error: message })
    }
  })

  // COMPLETE ALL SUBTASKS
  app.post('/:id/subtasks/complete-all', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }

    try {
      await TasksService.completeAllSubtasks(user.id, id)
      return reply.send({ success: true, message: 'All subtasks completed' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete subtasks'
      return reply.status(400).send({ success: false, error: message })
    }
  })
}
