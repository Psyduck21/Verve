import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { TasksService, CreateSubtaskSchema } from './tasks.service'
import { sanitizeHtml } from '../../lib/sanitize'
import { db } from '../../lib/db'
import { tasks } from '@verve/db'
import { eq, desc, lt, gte, lte, and, isNull, or, isNotNull } from '@verve/db'
import { taskExternalMetadata, taskRecurrences } from '@verve/db'
import { TaskListQuerySchema } from './tasks.routes.validation'
const CreateTaskSchema = z.object({
  routine_id: z.string().uuid().nullable().optional(),
  title: z.string(),
  description: z.string().optional().nullable(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'missed', 'cancelled']).optional(),
  category: z.string().optional().nullable(),
  scheduled_at: z.string().datetime({ offset: true }).or(z.date()).nullable().optional(),
  estimated_duration_minutes: z.number().optional(),
  is_time_locked: z.boolean().optional(),
  recurrence_rule: z.string().optional().nullable(),
})

const UpdateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'missed', 'cancelled']).optional(),
  category: z.string().optional().nullable(),
  scheduled_at: z.string().datetime({ offset: true }).or(z.date()).nullable().optional(),
  estimated_duration_minutes: z.number().optional(),
  actual_duration_minutes: z.number().optional().nullable(),
  is_time_locked: z.boolean().optional(),
  recurrence_rule: z.string().optional().nullable(),
})

// Define response schemas for Fastify validation and optimization
const TaskResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        status: { type: 'string' },
        priority: { type: 'string' },
        scheduled_at: { type: 'string', format: 'date-time', nullable: true },
        estimated_duration_minutes: { type: 'number', nullable: true },
        actual_duration_minutes: { type: 'number', nullable: true },
        category: { type: 'string', nullable: true },
        is_time_locked: { type: 'boolean' },
        parent_task_id: { type: 'string', nullable: true },
        routine_id: { type: 'string', nullable: true },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    }
  }
} as const

const TaskListResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string' },
          priority: { type: 'string' },
          scheduled_at: { type: 'string', format: 'date-time', nullable: true },
          estimated_duration_minutes: { type: 'number', nullable: true },
          actual_duration_minutes: { type: 'number', nullable: true },
          category: { type: 'string', nullable: true },
          is_time_locked: { type: 'boolean' },
          parent_task_id: { type: 'string', nullable: true },
          routine_id: { type: 'string', nullable: true },
          updated_at: { type: 'string', format: 'date-time' },
          external_provider: { type: 'string', nullable: true },
          recurrence_rule: { type: 'string', nullable: true }
        }
      }
    },
    pagination: {
      type: 'object',
      properties: {
        nextCursor: { type: 'string', nullable: true },
        hasMore: { type: 'boolean' },
        limit: { type: 'number' }
      }
    }
  }
} as const

export const tasksRoutes: FastifyPluginAsync = async (app) => {

  // LIST TASKS (with pagination)
  app.get('/', { 
    preHandler: [app.authenticate],
    schema: { response: { 200: TaskListResponseSchema } }
  }, async (req, reply) => {
    const user = req.user!

    const parsed = TaskListQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    const { cursor, limit, start_date, end_date } = parsed.data
    if (start_date && end_date && start_date > end_date) {
      return reply.status(400).send({ success: false, error: 'start_date must be before or equal to end_date' })
    }

    // Build conditions to include:
    // 1. Parent tasks (no parent_task_id): recurring masters always, non-recurring only if in date range
    // 2. Child tasks (have parent_task_id): only if they fall within the date range
    // This is CRITICAL for the frontend's virtual projection skip logic to work correctly
    const hasDateFilter = !!(start_date || end_date)

    const parentTaskConditions: any[] = [
      eq(tasks.user_id, user.id),
      isNull(tasks.parent_task_id),
      cursor ? lt(tasks.scheduled_at, new Date(cursor)) : undefined,
    ]

    if (hasDateFilter) {
      parentTaskConditions.push(
        or(
          isNotNull(taskRecurrences.id),
          and(
            start_date ? gte(tasks.scheduled_at, start_date) : undefined,
            end_date ? lte(tasks.scheduled_at, end_date) : undefined
          )
        )
      )
    }

    const childTaskConditions: any[] = [
      eq(tasks.user_id, user.id),
      isNotNull(tasks.parent_task_id),
      cursor ? lt(tasks.scheduled_at, new Date(cursor)) : undefined,
    ]

    if (hasDateFilter) {
      if (start_date) childTaskConditions.push(gte(tasks.scheduled_at, start_date))
      if (end_date) childTaskConditions.push(lte(tasks.scheduled_at, end_date))
    }

    // Query: fetch both parent and child tasks
    const results = await db
      .select()
      .from(tasks)
      .leftJoin(taskExternalMetadata, eq(tasks.id, taskExternalMetadata.task_id))
      .leftJoin(taskRecurrences, eq(tasks.id, taskRecurrences.task_id))
      .where(
        or(
          and(...parentTaskConditions),
          and(...childTaskConditions)
        )
      )
      .orderBy(desc(tasks.scheduled_at))
      .limit(limit + 1) // Fetch one extra to determine if there's a next page

    const flattenedResults = results.map(row => ({
      ...row.tasks,
      external_provider: row.task_external_metadata?.external_provider || null,
      recurrence_rule: row.task_recurrences?.recurrence_rule || null,
    }))

    const hasMore = flattenedResults.length > limit
    const taskList = hasMore ? flattenedResults.slice(0, -1) : flattenedResults
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
  app.post('/', { 
    preHandler: [app.authenticate, app.validateCSRF],
    schema: { response: { 201: TaskResponseSchema } }
  }, async (req, reply) => {
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
  app.put('/:id', { 
    preHandler: [app.authenticate, app.validateCSRF],
    schema: { response: { 200: TaskResponseSchema } }
  }, async (req, reply) => {
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
  app.delete('/:id', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
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
  app.post('/:id/subtasks', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
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
  app.put('/:id/subtasks/:subtaskId', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
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
  app.delete('/:id/subtasks/:subtaskId', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
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
  app.post('/:id/subtasks/reorder', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
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
  app.post('/:id/subtasks/complete-all', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
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

  // MATERIALIZE A VIRTUAL RECURRING OCCURRENCE
  // Called when the user clicks/drags a virtual (projected) recurring task on the calendar.
  // Creates a real DB row (recurrence exception) linked to the master task via parent_task_id.
  app.post('/:id/materialize', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
    const user = req.user!
    const { id: masterTaskId } = req.params as { id: string }

    const MaterializeSchema = z.object({
      scheduled_at: z.string().datetime({ offset: true }),
      estimated_duration_minutes: z.number().optional(),
    })

    const parsed = MaterializeSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    try {
      const task = await TasksService.materializeOccurrence(user.id, masterTaskId, parsed.data.scheduled_at, parsed.data.estimated_duration_minutes)
      return reply.status(201).send({ success: true, data: task })
    } catch (e: any) {
      if (e.message.includes('not found')) {
        return reply.status(404).send({ success: false, error: e.message })
      }
      throw e
    }
  })
}
