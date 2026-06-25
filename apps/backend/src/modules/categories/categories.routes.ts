import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { CategoriesService } from './categories.service'

const CreateCategorySchema = z.object({
  name: z.string(),
  color: z.string().optional().default('#3b82f6')
})

export const categoriesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const items = await CategoriesService.getCategories(user.id)
    return reply.send({ success: true, data: items })
  })

  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const parsed = CreateCategorySchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }
    const category = await CategoriesService.createCategory(user.id, parsed.data.name, parsed.data.color)
    return reply.status(201).send({ success: true, data: category })
  })
}
