import type { FastifyPluginAsync } from 'fastify'
import { ExternalTaskRequestSchema } from '@verve/shared'
import { db } from '../../lib/db'
import { tasks, routines, taskExternalMetadata } from '@verve/db'
import { eq, and, desc } from '@verve/db'
import { TasksService } from '../tasks/tasks.service'
import { IntegrationsService } from './integrations.service'

export const integrationsRoutes: FastifyPluginAsync = async (app) => {

  // POST /v1/integrations/external-tasks
  app.post('/external-tasks', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
    const user = req.user!
    const body = ExternalTaskRequestSchema.parse(req.body)

    let inboxRoutineId = (await db.query.routines.findFirst({
      where: (r, { eq, and }) => and(eq(r.user_id, user.id), eq(r.title, 'Inbox')),
    }))?.id

    if (!inboxRoutineId) {
      const [newRoutine] = await db
        .insert(routines)
        .values({
          user_id: user.id,
          title: 'Inbox',
          goal: 'Unsorted external tasks and ideas',
          is_active: true,
          sort_order: -1,
        })
        .returning({ id: routines.id })
      inboxRoutineId = newRoutine.id
    }

    // Check if task exists using the new table
    const existingMeta = await db.query.taskExternalMetadata.findFirst({
      where: (m, { eq, and }) => and(
        eq(m.user_id, user.id),
        eq(m.external_id, body.external_id),
        eq(m.external_provider, body.external_provider)
      )
    })

    if (existingMeta) {
      const existingTask = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, existingMeta.task_id)
      })
      return reply.send({ success: true, message: 'Task already synced', data: existingTask })
    }

    const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at) : null
    const duration = body.estimated_duration_minutes || 30

    const task = await TasksService.createTask(user.id, {
      title: body.title,
      description: body.description,
      category: body.category,
      routine_id: inboxRoutineId,
      priority: body.priority || 'medium',
      status: 'not_started',
      scheduled_at: scheduledAt,
      estimated_duration_minutes: duration,
      is_time_locked: true,
      external_provider: body.external_provider,
      external_id: body.external_id,
      external_link: body.external_link,
      source_metadata: body.source_metadata || {}
    })

    app.log.info({ user: user.id, provider: body.external_provider, task_id: task.id }, 'External task synced')
    return reply.send({ success: true, data: task })
  })

  // POST /v1/integrations/:provider/:integrationId/sync
  app.post('/:provider/:integrationId/sync', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
    const user = req.user!
    const { provider, integrationId } = req.params as { provider: string, integrationId: string }

    try {
      const integrationsService = new IntegrationsService(app.log)
      const result = await integrationsService.syncProvider(user.id, integrationId, provider)
      return reply.send({ success: true, data: result })
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message })
    }
  })
}
