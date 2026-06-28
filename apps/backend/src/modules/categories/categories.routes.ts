import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { CategoriesService } from './categories.service'
import { redis } from '../../lib/redis'

const CreateCategorySchema = z.object({
  name: z.string(),
  color: z.string().optional().default('#3b82f6')
})

const UpdateCategorySchema = z.object({
  name: z.string().optional(),
  color: z.string().optional()
})

export const categoriesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { page = 1, limit = 50 } = req.query as { page?: string, limit?: string }
    const pageNum = Math.max(1, parseInt(String(page)) || 1)
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit)) || 50))
    const offsetNum = (pageNum - 1) * limitNum

    const cacheKey = `cache:categories:${user.id}:p${pageNum}:l${limitNum}`
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        reply.header('Cache-Control', 'private, max-age=300')
        return reply.send({ success: true, data: cached })
      }
    } catch (e) {
      app.log.warn({ err: e }, 'Redis cache read failed for categories')
    }

    const items = await CategoriesService.getCategories(user.id, limitNum, offsetNum)
    
    try {
      await redis.set(cacheKey, items, { ex: 300 })
    } catch (e) {
      app.log.warn({ err: e }, 'Redis cache write failed for categories')
    }

    reply.header('Cache-Control', 'private, max-age=300')
    return reply.send({ success: true, data: items })
  })

  app.post('/', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
    const user = req.user!
    const parsed = CreateCategorySchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }
    const category = await CategoriesService.createCategory(user.id, parsed.data.name, parsed.data.color)
    return reply.status(201).send({ success: true, data: category })
  })

  app.put('/:id', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }
    const parsed = UpdateCategorySchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }
    const category = await CategoriesService.updateCategory(id, user.id, parsed.data)
    return reply.send({ success: true, data: category })
  })

  app.delete('/:id', { preHandler: [app.authenticate, app.validateCSRF] }, async (req, reply) => {
    const user = req.user!
    const { id } = req.params as { id: string }
    await CategoriesService.deleteCategory(id, user.id)
    return reply.send({ success: true, message: 'Category deleted' })
  })
}
