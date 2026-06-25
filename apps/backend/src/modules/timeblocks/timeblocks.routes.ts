import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { TimeBlocksService, CreateTimeBlockSchema, UpdateTimeBlockSchema } from './timeblocks.service'

export const timeblocksRoutes: FastifyPluginAsync = async (app) => {
  // CREATE TIME BLOCK
  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!

    const parsed = CreateTimeBlockSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    try {
      const timeBlock = await TimeBlocksService.createTimeBlock(user.id, parsed.data)
      return reply.status(201).send({ success: true, data: timeBlock })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create time block'
      return reply.status(400).send({ success: false, error: message })
    }
  })

  // LIST TIME BLOCKS
  app.get('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { start_date, end_date, task_id } = req.query as {
      start_date?: string
      end_date?: string
      task_id?: string
    }

    try {
      const blocks = await TimeBlocksService.listTimeBlocks(user.id, {
        start_date,
        end_date,
        task_id,
      })
      return reply.send({ success: true, data: blocks })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list time blocks'
      return reply.status(500).send({ success: false, error: message })
    }
  })

  // GET TIME BLOCK BY ID
  app.get('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }

    try {
      const block = await TimeBlocksService.getTimeBlock(id, user.id)
      return reply.send({ success: true, data: block })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get time block'
      return reply.status(404).send({ success: false, error: message })
    }
  })

  // UPDATE TIME BLOCK
  app.put('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }

    const parsed = UpdateTimeBlockSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    try {
      const block = await TimeBlocksService.updateTimeBlock(id, user.id, parsed.data)
      return reply.send({ success: true, data: block })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update time block'
      return reply.status(400).send({ success: false, error: message })
    }
  })

  // DELETE TIME BLOCK
  app.delete('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }

    try {
      await TimeBlocksService.deleteTimeBlock(id, user.id)
      return reply.send({ success: true, message: 'Time block deleted' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete time block'
      return reply.status(404).send({ success: false, error: message })
    }
  })

  // CONVERT TIME BLOCK TO TASK
  app.post('/:id/convert-to-task', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }

    try {
      const result = await TimeBlocksService.convertToTask(id, user.id)
      return reply.send({ success: true, data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to convert time block to task'
      return reply.status(400).send({ success: false, error: message })
    }
  })

  // GET TIME BLOCKS FOR DATE
  app.get('/date/:date', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { date } = req.params as { date: string }

    try {
      const dateObj = new Date(date)
      if (isNaN(dateObj.getTime())) {
        return reply.status(400).send({ success: false, error: 'Invalid date format' })
      }

      const blocks = await TimeBlocksService.getTimeBlocksForDate(user.id, dateObj)
      return reply.send({ success: true, data: blocks })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get time blocks for date'
      return reply.status(500).send({ success: false, error: message })
    }
  })
}
