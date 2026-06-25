import { z } from 'zod'

// ── Enums ─────────────────────────────────────────────────────
export const TaskPrioritySchema = z.enum(['critical', 'high', 'medium', 'low'])
export const TaskStatusSchema   = z.enum(['not_started', 'in_progress', 'completed', 'missed', 'cancelled'])
export const UserPlanSchema     = z.enum(['free', 'pro', 'enterprise'])

// ── Date/Time helpers ─────────────────────────────────────────
const TimeString = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Must be HH:MM or HH:MM:SS')
const ISOString  = z.string().datetime({ offset: true })

// ── Intent Graph (AI output) ──────────────────────────────────
export const IntentActionSchema = z.object({
  action:                z.enum(['MOVE', 'CANCEL', 'UPDATE', 'CREATE']),
  task_id:               z.string().uuid().optional(),
  new_scheduled_at:      ISOString.optional(),
  new_duration_minutes:  z.number().int().positive().max(480).optional(),
  new_title:             z.string().min(1).max(200).optional(),
  new_priority:          TaskPrioritySchema.optional(),
})

export const IntentGraphSchema = z
  .array(IntentActionSchema)
  .min(1, 'Intent graph must have at least one action')
  .max(20, 'Intent graph must not exceed 20 actions')

// ── Generated Routine (AI output) ────────────────────────────
export const GeneratedTaskSchema = z.object({
  title:                      z.string().min(1).max(200),
  priority:                   TaskPrioritySchema,
  scheduled_at:               ISOString,
  estimated_duration_minutes: z.number().int().min(5).max(480),
  recurrence_rule:            z.string().optional(),
  category:                   z.string().optional(),
})

export const GeneratedRoutineSchema = z.object({
  routine: z.object({
    title: z.string().min(1).max(100),
    goal:  z.string().min(1).max(500),
  }),
  tasks: z.array(GeneratedTaskSchema).min(1).max(30),
})

// ── Sync Push Payload ─────────────────────────────────────────
export const SyncMutationSchema = z.object({
  table: z.enum(['tasks', 'routines', 'task_completions']),
  operation: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  record: z.record(z.unknown()),   // Loosely typed here; services validate further
  client_updated_at: ISOString,
})

export const SyncPushRequestSchema = z.object({
  client_timestamp: ISOString,
  mutations: z
    .array(SyncMutationSchema)
    .min(1, 'Must include at least one mutation')
    .max(500, 'Batch exceeds maximum of 500 mutations'),
})

// ── Sync Pull Request ─────────────────────────────────────────
export const SyncPullRequestSchema = z.object({
  last_synced_at: ISOString,
  tables: z
    .array(z.enum(['tasks', 'routines', 'task_completions']))
    .min(1)
    .max(3),
})

// ── AI Reschedule Request ─────────────────────────────────────
export const RescheduleRequestSchema = z.object({
  command: z.string().min(1).max(500),
  context: z.object({
    tasks: z.array(
      z.object({
        id:                           z.string().uuid(),
        title:                        z.string(),
        priority:                     TaskPrioritySchema,
        status:                       TaskStatusSchema,
        scheduled_at:                 ISOString,
        estimated_duration_minutes:   z.number().int().positive(),
        is_time_locked:               z.boolean(),
      })
    ).max(60),  // 30-day window × max 2 tasks/slot
  }),
})

// ── External Tasks Request ────────────────────────────────────
export const ExternalProviderSchema = z.enum(['google_calendar', 'gmail', 'chrome_extension', 'slack', 'outlook', 'zoom'])

export const ExternalTaskRequestSchema = z.object({
  title:             z.string().min(1).max(200),
  external_provider: ExternalProviderSchema,
  external_id:       z.string().min(1),
  external_link:     z.string().url().optional(),
  source_metadata:   z.record(z.unknown()).optional(),
  raw_content:       z.string().max(20000).optional(),
  scheduled_at:      ISOString.optional(),
  estimated_duration_minutes: z.number().int().positive().optional(),
  description:       z.string().max(5000).optional(),
  priority:          TaskPrioritySchema.optional(),
  category:          z.string().max(100).optional(),
})

export const EmailExtractionSchema = z.object({
  title: z.string().describe("Actionable task title extracted from email subject or body"),
  description: z.string().describe("A brief summary of the email body describing the task context"),
  scheduled_at: ISOString.optional().describe("ISO-8601 timestamp. Provide if a specific day or time is mentioned. Leave null if absolutely no date is implied."),
  estimated_duration_minutes: z.number().int().min(5).max(480).optional().describe("Estimated minutes to complete, default to 30 if unknown."),
  priority: TaskPrioritySchema.describe("Inferred priority based on urgency words"),
  category: z.string().describe("Inferred category from the text, e.g. 'work', 'personal', 'health', 'learning'"),
})

// ── AI Extract Email Request ───────────────────────────────────
export const ExtractEmailRequestSchema = z.object({
  raw_content: z.string().max(20000),
  current_date_time: ISOString,
})

// ── AI Parse Task Request ──────────────────────────────────────
export const ParseTaskSchema = z.object({
  title: z.string().describe("Cleaned actionable task title without the date or priority modifiers"),
  scheduled_at: ISOString.optional().describe("ISO-8601 timestamp for when the task is scheduled. Return null if no time is specified."),
  priority: TaskPrioritySchema.optional().default('medium').describe("Inferred priority. Default to 'medium' if unspecified."),
  category: z.string().optional().default('personal').describe("Inferred category from the text, e.g. 'work' or 'personal' or 'health' or 'learning'. Default to 'personal' if unspecified."),
})

export const ParseTaskRequestSchema = z.object({
  raw_input: z.string().max(1000),
  local_time_string: z.string(),
  timezone: z.string(),
})

// ── AI Generate Routine Request ───────────────────────────────
export const GenerateRoutineRequestSchema = z.object({
  profile: z.object({
    grind_type:                 z.string().min(1).max(100),
    wake_time:                  TimeString,
    sleep_time:                 TimeString,
    daily_commitment_minutes:   z.number().int().min(15).max(1440),
    full_name:                  z.string().min(1).max(100),
  }),
  answers: z.array(
    z.object({
      question: z.string(),
      answer:   z.string().max(1000),
    })
  ).max(10),
})

// ── AI Omnibox Request ──────────────────────────────────────────
export const OmniboxRequestSchema = z.object({
  command: z.string().min(1).max(1000),
  local_time_string: z.string(),
  timezone: z.string(),
  context: z.object({
    tasks: z.array(
      z.object({
        id:                           z.string().uuid(),
        title:                        z.string(),
        priority:                     TaskPrioritySchema,
        status:                       TaskStatusSchema,
        scheduled_at:                 ISOString,
        estimated_duration_minutes:   z.number().int().positive(),
        is_time_locked:               z.boolean(),
      })
    ).max(100),
  }),
})

// ── Exported types (inferred from schemas) ────────────────────
export type TaskPriority          = z.infer<typeof TaskPrioritySchema>
export type TaskStatus            = z.infer<typeof TaskStatusSchema>
export type IntentAction          = z.infer<typeof IntentActionSchema>
export type IntentGraph           = z.infer<typeof IntentGraphSchema>
export type GeneratedTask         = z.infer<typeof GeneratedTaskSchema>
export type GeneratedRoutine      = z.infer<typeof GeneratedRoutineSchema>
export type SyncPushRequest       = z.infer<typeof SyncPushRequestSchema>
export type SyncPullRequest       = z.infer<typeof SyncPullRequestSchema>
export type RescheduleRequest     = z.infer<typeof RescheduleRequestSchema>
export type GenerateRoutineRequest = z.infer<typeof GenerateRoutineRequestSchema>
export type ExternalTaskRequest   = z.infer<typeof ExternalTaskRequestSchema>
export type EmailExtraction       = z.infer<typeof EmailExtractionSchema>
export type ExtractEmailRequest   = z.infer<typeof ExtractEmailRequestSchema>
export type ParseTask             = z.infer<typeof ParseTaskSchema>
export type ParseTaskRequest      = z.infer<typeof ParseTaskRequestSchema>
export type OmniboxRequest        = z.infer<typeof OmniboxRequestSchema>
