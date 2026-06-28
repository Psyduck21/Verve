import { z } from 'zod'

export const TaskListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
})
