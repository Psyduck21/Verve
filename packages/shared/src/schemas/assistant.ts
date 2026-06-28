import { z } from 'zod'

export const AssistantActionTypeSchema = z.enum([
  'CREATE_ROUTINE',
  'CREATE_TASK',
  'SCHEDULE_TASK',
  'UPDATE_TASK',
  'RESOLVE_CONFLICT',
])

export const AssistantActionPayloadSchema = z.object({
  task_id: z.string().uuid().optional(),
  routine_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  scheduled_at: z.string().datetime({ offset: true }).optional(),
  estimated_duration_minutes: z.number().int().min(5).max(480).optional(),
  category: z.string().max(100).optional(),
  routine_title: z.string().max(200).optional(),
  routine_goal: z.string().max(500).optional(),
})

export const AssistantPlanActionSchema = z.object({
  type: AssistantActionTypeSchema,
  title: z.string().min(1).max(200),
  details: z.string().min(1).max(1000),
  payload: AssistantActionPayloadSchema.optional(),
})

export const AssistantDraftPlanSchema = z.object({
  plan_id: z.string().min(1).max(100),
  summary: z.string().min(1).max(500),
  actions: z.array(AssistantPlanActionSchema).min(1).max(10),
  needs_confirmation: z.boolean().default(true),
})

export const AssistantPlanRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  context: z.object({
    tasks: z.array(
      z.object({
        id: z.string().uuid().optional(),
        title: z.string(),
        status: z.string().optional(),
        is_time_locked: z.boolean().optional(),
      })
    ).max(50).optional(),
    conversation_history: z.array(
      z.object({
        role: z.enum(['user', 'ai']),
        content: z.string(),
      })
    ).max(10).optional(),
  }).optional(),
})

export const AssistantExecuteRequestSchema = z.object({
  plan_id: z.string().min(1).max(100),
  actions: z.array(AssistantPlanActionSchema).min(1).max(10),
})

export type AssistantActionType = z.infer<typeof AssistantActionTypeSchema>
export type AssistantPlanAction = z.infer<typeof AssistantPlanActionSchema>
export type AssistantDraftPlan = z.infer<typeof AssistantDraftPlanSchema>
export type AssistantPlanRequest = z.infer<typeof AssistantPlanRequestSchema>
export type AssistantExecuteRequest = z.infer<typeof AssistantExecuteRequestSchema>
