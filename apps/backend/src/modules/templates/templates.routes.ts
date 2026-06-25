import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { TemplatesService, CreateTemplateSchema, UpdateTemplateSchema } from './templates.service'

export const templatesRoutes: FastifyPluginAsync = async (app) => {
  // CREATE TEMPLATE
  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!

    const parsed = CreateTemplateSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    try {
      const template = await TemplatesService.createTemplate(user.id, parsed.data)
      return reply.status(201).send({ success: true, data: template })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create template'
      return reply.status(400).send({ success: false, error: message })
    }
  })

  // LIST TEMPLATES
  app.get('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { include_public } = req.query as { include_public?: string }

    try {
      const templates = await TemplatesService.listTemplates(user.id, {
        include_public: include_public === 'true',
      })
      return reply.send({ success: true, data: templates })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list templates'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET TEMPLATE BY ID
  app.get('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }

    try {
      const template = await TemplatesService.getTemplate(id, user.id)
      return reply.send({ success: true, data: template })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get template'
      return reply.status(404).send({ success: false, error: message })
    }
  })

  // UPDATE TEMPLATE
  app.put('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }

    const parsed = UpdateTemplateSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    try {
      const template = await TemplatesService.updateTemplate(id, user.id, parsed.data)
      return reply.send({ success: true, data: template })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update template'
      return reply.status(400).send({ success: false, error: message })
    }
  })

  // DELETE TEMPLATE
  app.delete('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }

    try {
      await TemplatesService.deleteTemplate(id, user.id)
      return reply.send({ success: true, message: 'Template deleted' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete template'
      return reply.status(404).send({ success: false, error: message })
    }
  })

  // APPLY TEMPLATE
  app.post('/:id/apply', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }
    const { scheduled_at } = req.body as { scheduled_at?: string }

    try {
      const result = await TemplatesService.applyTemplate(id, user.id, { scheduled_at })
      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply template'
      return reply.status(400).send({ success: false, error: message })
    }
  })

  // DUPLICATE TEMPLATE
  app.post('/:id/duplicate', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }

    try {
      const template = await TemplatesService.duplicateTemplate(id, user.id)
      return reply.send({ success: true, data: template })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to duplicate template'
      return reply.status(400).send({ success: false, error: message })
    }
  })
}
