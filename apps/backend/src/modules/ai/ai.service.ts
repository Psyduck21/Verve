import { db } from '../../lib/db'
import { aiRequestLog, users, tasks, eq, sql, and } from '@verve/db'
import { callOpenRouter, FREE_MODELS } from '../../lib/openrouter'
import { redis } from '../../lib/redis'
import {
  GeneratedRoutineSchema,
  EmailExtractionSchema,
  IntentGraphSchema,
  GenerateRoutineRequest,
  ExtractEmailRequest,
  RescheduleRequest,
  ParseTaskRequest,
  ParseTaskSchema,
  OmniboxRequest
} from '@verve/shared'
import { MemoryService } from './memory.service'
import { UserProfileService } from '../users'
import { logger } from '../../lib/logger'

export class AiService {
  // Optimized: Use Redis for rate limiting instead of database locks
  static async checkBudgetAndIncrement(userId: string) {
    const today = new Date().toISOString().split('T')[0]
    const key = `ai_budget:${userId}:${today}`

    const current = await redis.incr(key)
    if (current === 1) {
      await redis.expire(key, 86400) // Expire at end of day
    }

    if (current > 100) {
      throw new Error('Daily AI budget exceeded')
    }

    // Async update to database for persistence (fire and forget)
    db.update(users)
      .set({ ai_requests_used_today: sql`${users.ai_requests_used_today} + 1` })
      .where(eq(users.id, userId))
      .catch(err => logger.error('Failed to update AI budget in DB', err as Error))
  }

  private static async logUsage(userId: string, requestType: any, aiResponse: any, latencyMs: number) {
    try {
      await db.insert(aiRequestLog).values({
        user_id: userId,
        request_type: requestType,
        openrouter_model: aiResponse.model_used,
        requested_model: FREE_MODELS.join(','),
        input_tokens: aiResponse.usage.input,
        output_tokens: aiResponse.usage.output,
        latency_ms: latencyMs,
        success: true,
      })
    } catch (e: any) {
      logger.error('Failed to log AI usage', e as Error)
    }
  }

  static async logFailure(userId: string, requestType: any, errorMsg: string) {
    try {
      await db.insert(aiRequestLog).values({
        user_id: userId,
        request_type: requestType,
        openrouter_model: 'unknown',
        requested_model: FREE_MODELS.join(','),
        success: false,
        error_code: errorMsg,
      })
    } catch (e: any) {
      logger.error('Failed to log AI failure', e as Error)
    }
  }

  static async generateRoutine(userId: string, body: GenerateRoutineRequest) {
    await this.checkBudgetAndIncrement(userId)

    // Fetch user profile for scheduling constraints
    const userProfile = await UserProfileService.getUserProfile(userId)
    const userContext = userProfile ? await UserProfileService.getAIContext(userId) : ''

    const relevantMemories = await MemoryService.getRelevantMemories(userId, JSON.stringify(body.answers))
    const memoryContext = relevantMemories.length > 0 ? `Past Habits & Memories:\n- ${relevantMemories.join('\n- ')}` : ''

    // const systemPrompt = `You are a productivity AI. Generate a customized daily routine based on the user profile. Return JSON strictly matching: { "routine": { "title": "string", "goal": "string" }, "tasks": [ { "title": "string", "priority": "critical|high|medium|low", "scheduled_at": "ISOString", "estimated_duration_minutes": number, "category": "string" } ] }\n\n${memoryContext}`
    const systemPromptWithDescription = `You MUST include a short, human-friendly 'description' for each task that summarizes intent and context. Use the user's profile details (full_name, grind_type, wake_time, daily_commitment_minutes) and the task title to craft a meaningful description. Do NOT default category to 'personal' — infer a category for each task such as 'work', 'personal', 'health', 'learning', etc. Return JSON strictly matching: { "routine": { "title": "string", "goal": "string" }, "tasks": [ { "title": "string", "priority": "critical|high|medium|low", "scheduled_at": "ISOString", "estimated_duration_minutes": number, "category": "string", "description": "string" } ] }\n\n${memoryContext}`
    const userPrompt = `${userContext}
Profile: ${JSON.stringify(body.profile)}
Answers: ${JSON.stringify(body.answers)}`

    const start = Date.now()
    try {
      const aiResponse = await callOpenRouter({
        systemPrompt: systemPromptWithDescription,
        userPrompt,
        schema: GeneratedRoutineSchema,
      })

      // Validate scheduled times are within user's awake hours and respect weekend preferences
      if (aiResponse.data?.tasks && userProfile) {
        for (const task of aiResponse.data.tasks) {
          if (task.scheduled_at) {
            const isValidTime = await UserProfileService.isValidScheduleTimeWithProfile(userId, task.scheduled_at)
            if (!isValidTime) {
              logger.warn(`AI generated routine task outside awake hours: ${task.scheduled_at}`)
              // Remove the scheduled_at to make it unscheduled rather than invalid
              delete (task as any).scheduled_at
              continue
            }

            // Check weekend scheduling preference
            const scheduledDate = new Date(task.scheduled_at)
            const isWeekendAllowed = await UserProfileService.isWeekendSchedulingAllowed(userId, scheduledDate)
            if (!isWeekendAllowed) {
              logger.warn(`AI generated routine task on weekend when user is not a weekend warrior: ${task.scheduled_at}`)
              // Remove the scheduled_at to make it unscheduled rather than invalid
              delete (task as any).scheduled_at
            }
          }
        }
      }

      await this.logUsage(userId, 'generate_routine', aiResponse, Date.now() - start)
      return aiResponse.data
    } catch (e: any) {
      await this.logFailure(userId, 'generate_routine', e.message)
      throw e
    }
  }

  static async extractEmail(userId: string, body: ExtractEmailRequest) {
    await this.checkBudgetAndIncrement(userId)

    const systemPrompt = `You are a productivity AI that extracts actionable tasks from raw email content. 
STRICT RULES:
1. Return JSON strictly matching the provided schema.
2. If a specific date or time is mentioned, resolve it relative to the 'Current Date/Time' provided in the context. Format as a full ISO-8601 timestamp INCLUDING the correct timezone offset from the context (e.g., YYYY-MM-DDTHH:mm:ss+05:30 or Z).
3. If NO specific date is implied, YOU MUST OMIT 'scheduled_at' entirely. Do NOT use the current date/time as a fallback.
4. Extract a SHORT (max 5-6 words) actionable task title and put it in the 'title' field.
5. Summarize the email body into a single, brief 1-line text and put it in the 'description' field.
6. Infer a 'category' from the semantic meaning of the task. Use only one of: 'work', 'personal', or 'health'.
7. Infer the 'priority' (critical, high, medium, low) based on the urgency of the email.`

    const userPrompt = `Current Date/Time: ${body.current_date_time}\nEmail Content:\n"""\n${body.raw_content}\n"""`

    const start = Date.now()
    try {
      const aiResponse = await callOpenRouter({
        systemPrompt,
        userPrompt,
        schema: EmailExtractionSchema,
      })
      await this.logUsage(userId, 'extract_email', aiResponse, Date.now() - start)
      return aiResponse.data
    } catch (e: any) {
      await this.logFailure(userId, 'extract_email', e.message)
      throw e
    }
  }

  static async reschedule(userId: string, body: RescheduleRequest) {
    await this.checkBudgetAndIncrement(userId)

    // Fetch user profile for scheduling constraints
    const userProfile = await UserProfileService.getUserProfile(userId)
    const userContext = userProfile ? await UserProfileService.getAIContext(userId) : ''

    const userTasks = await db.select({
      id: tasks.id,
      title: tasks.title,
      scheduled_at: tasks.scheduled_at,
      priority: tasks.priority,
      is_time_locked: tasks.is_time_locked,
    }).from(tasks).where(and(eq(tasks.user_id, userId), eq(tasks.status, 'not_started')))

    const systemPrompt = `You are an intent parser. Map the user's natural language command to specific calendar actions based on their current tasks. STRICT RULES: Any task with is_time_locked=true is an external calendar event (e.g. from Google Calendar) and CANNOT be moved, canceled, or updated under any circumstances. Do not output CANCEL actions unless the user explicitly asks to remove or delete a specific task. For commands like "clear my afternoon" or "push tasks to tomorrow", always reschedule tasks using MOVE or UPDATE instead of canceling them. When rescheduling, prioritize finding a new time within the upcoming week. ONLY omit 'new_scheduled_at' (falling back to unscheduled) if it is completely impossible to schedule the task within the next 7 days based on the user's constraints. If you produce any CREATE actions, include both "description" and "category" on every CREATE action, and make them non-empty strings. Use only one of the categories: 'work', 'personal', or 'health'. Output JSON matching an array of actions: { "action": "MOVE"|"UPDATE"|"CREATE", "task_id": "uuid(optional)", "new_scheduled_at": "ISOString", "new_title": "string", "description": "string", "category": "string" }`

    const userPrompt = `${userContext}
Command: "${body.command}"
Current Context: ${JSON.stringify(userTasks)}`

    const start = Date.now()
    try {
      const aiResponse = await callOpenRouter({
        systemPrompt,
        userPrompt,
        schema: IntentGraphSchema,
      })

      if (!aiResponse || !aiResponse.data) {
        throw new Error('AI response is invalid or missing data')
      }

      const validTaskIds = new Set(userTasks.map(t => t.id))
      const timeLockedTaskIds = new Set(userTasks.filter(t => t.is_time_locked).map(t => t.id))

      const filteredActions = aiResponse.data.filter((action: any) => {
        if (action.action === 'CANCEL') {
          throw new Error('AI generated a CANCEL action. Use MOVE/UPDATE to reschedule tasks instead of cancellation.')
        }
        if (action.action !== 'CREATE' && action.task_id) {
          if (!validTaskIds.has(action.task_id)) {
            throw new Error(`AI generated invalid task_id: ${action.task_id}`)
          }
          if (timeLockedTaskIds.has(action.task_id)) {
            // Drop attempts to move time-locked tasks
            return false
          }
        }

        // Validate scheduled times are within user's awake hours
        if (action.new_scheduled_at && userProfile) {
          const isValidTime = UserProfileService.isValidScheduleTimeWithProfile(userId, action.new_scheduled_at)
          if (!isValidTime) {
            logger.warn(`AI scheduled task outside awake hours: ${action.new_scheduled_at}`)
            // Remove the scheduled_at to make it unscheduled rather than invalid
            delete (action as any).new_scheduled_at
          }
        }

        return true
      })

      aiResponse.data = filteredActions

      await this.logUsage(userId, 'reschedule', aiResponse, Date.now() - start)
      return aiResponse.data
    } catch (e: any) {
      await this.logFailure(userId, 'reschedule', e.message)
      throw e
    }
  }

  static async processOmnibox(userId: string, body: OmniboxRequest) {
    await this.checkBudgetAndIncrement(userId)

    // Fetch user profile for scheduling constraints
    const userProfile = await UserProfileService.getUserProfile(userId)
    const userContext = userProfile ? await UserProfileService.getAIContext(userId) : ''

    const systemPrompt = `You are a universal AI Omnibox for a calendar app. Map the user's natural language command to an array of specific actions: { "action": "MOVE"|"UPDATE"|"CREATE", "task_id": "uuid(optional)", "new_scheduled_at": "ISOString", "new_duration_minutes": number, "new_title": "string", "new_priority": "critical|high|medium|low", "description": "string", "category": "string" }

STRICT RULES:
1. CREATE: For new tasks. Automatically infer priority, category and a concise description based on semantic meaning. For every CREATE action, include both "description" and "category" and make them non-empty strings. Use only one of the categories: 'work', 'personal', or 'health'. Calculate 'new_scheduled_at' in the user's timezone if a time or date is mentioned. If only a time is mentioned (e.g. "at 10am"), default to today (or tomorrow if the time has already passed today). If NO specific date or time is implied, YOU MUST OMIT 'new_scheduled_at' entirely. Do NOT use the current date/time as a fallback.
2. MOVE/UPDATE: For modifying existing tasks. Prefer rescheduling over cancellation. Do not use CANCEL or delete tasks unless the user explicitly asks to remove a specific task by name. When rescheduling, prioritize finding a new time within the upcoming week. ONLY omit 'new_scheduled_at' (falling back to unscheduled) if it is completely impossible to schedule the task within the next 7 days.
3. DEFRAGMENT: If the user asks to "defragment", "pack", or "optimize" their calendar, analyze the context. Identify flexible tasks (is_time_locked=false) and shift their 'new_scheduled_at' to form contiguous back-to-back blocks of time, filling in gaps between time-locked events.
4. For commands like "clear my afternoon", reschedule tasks to another time or day instead of canceling them.
5. Output MUST be an array of actions matching the schema.`

    const userPrompt = `${userContext}
Current Local Time: ${body.local_time_string}
User Timezone: ${body.timezone}
Command: "${body.command}"
Current Context: ${JSON.stringify(body.context.tasks)}`

    const start = Date.now()
    try {
      const aiResponse = await callOpenRouter({
        systemPrompt,
        userPrompt,
        schema: IntentGraphSchema,
      })

      if (!aiResponse || !aiResponse.data) {
        throw new Error('AI response is invalid or missing data')
      }

      const validTaskIds = new Set(body.context.tasks.map(t => t.id))
      const timeLockedTaskIds = new Set(body.context.tasks.filter(t => t.is_time_locked).map(t => t.id))

      const filteredActions = aiResponse.data.filter((action: any) => {
        if (action.action === 'CANCEL') {
          throw new Error('AI generated a CANCEL action. Use MOVE/UPDATE to reschedule tasks instead of cancellation.')
        }
        if (action.action !== 'CREATE' && action.task_id) {
          if (!validTaskIds.has(action.task_id)) {
            throw new Error(`AI generated invalid task_id: ${action.task_id}`)
          }
          if (timeLockedTaskIds.has(action.task_id)) {
            // Drop attempts to move time-locked tasks
            return false
          }
        }

        // Validate scheduled times are within user's awake hours
        if (action.new_scheduled_at && userProfile) {
          const isValidTime = UserProfileService.isValidScheduleTimeWithProfile(userId, action.new_scheduled_at)
          if (!isValidTime) {
            logger.warn(`AI scheduled task outside awake hours: ${action.new_scheduled_at}`)
            // Remove the scheduled_at to make it unscheduled rather than invalid
            delete (action as any).new_scheduled_at
          }
        }

        return true
      })

      aiResponse.data = filteredActions

      await this.logUsage(userId, 'parse_task', aiResponse, Date.now() - start) // Reusing parse_task enum for omnibox usage logging
      return aiResponse.data
    } catch (e: any) {
      await this.logFailure(userId, 'parse_task', e.message)
      throw e
    }
  }

  static async parseTask(userId: string, body: ParseTaskRequest) {
    await this.checkBudgetAndIncrement(userId)

    // Fetch user profile for scheduling constraints
    const userProfile = await UserProfileService.getUserProfile(userId)
    const userContext = userProfile ? await UserProfileService.getAIContext(userId) : ''

    const systemPrompt = `You are a productivity AI that extracts actionable tasks from natural language input.
STRICT RULES:
1. Return JSON strictly matching the provided schema.
2. If a specific date or time is mentioned, resolve it relative to the 'Current User Local Time' and 'User Timezone' provided in the context. If only a time is mentioned (e.g. "at 10am"), default to today (or tomorrow if the time has already passed today). You MUST calculate the exact scheduled time in the user's timezone, and return a full ISO-8601 timestamp that includes the timezone offset (e.g., YYYY-MM-DDTHH:mm:ss+05:30) or UTC (Z) equivalent.
3. If NO specific date is implied, YOU MUST OMIT 'scheduled_at' entirely. Do NOT use the current date/time as a fallback.
4. Extract an actionable task title. Remove words related to priority (e.g. !high) or category (e.g. #work) or the time from the final title.
5. Return the title as a clean, human-friendly task name. Preserve capitalization where appropriate and do not lowercase the title unless required for proper grammar.
6. AUTOMATIC PRIORITIZATION & CATEGORIZATION: You MUST infer the 'priority' (critical, high, medium, low) and 'category' from one of: 'work', 'personal', or 'health' based purely on the semantic meaning of the task description and title (e.g. "production outage" -> critical/work, "buy milk" -> low/personal).`

    const userPrompt = `${userContext}
Current User Local Time: ${body.local_time_string}
User Timezone: ${body.timezone}
Raw Input: "${body.raw_input}"`

    const start = Date.now()
    try {
      const aiResponse = await callOpenRouter({
        systemPrompt,
        userPrompt,
        schema: ParseTaskSchema,
      })

      // Validate scheduled time is within user's awake hours
      if (aiResponse.data?.scheduled_at && userProfile) {
        const isValidTime = await UserProfileService.isValidScheduleTimeWithProfile(userId, aiResponse.data.scheduled_at)
        if (!isValidTime) {
          logger.warn(`AI scheduled task outside awake hours: ${aiResponse.data.scheduled_at}`)
          // Remove the scheduled_at to make it unscheduled rather than invalid
          delete (aiResponse.data as any).scheduled_at
        }
      }

      await this.logUsage(userId, 'parse_task', aiResponse, Date.now() - start)
      return aiResponse.data
    } catch (e: any) {
      await this.logFailure(userId, 'parse_task', e.message)
      throw e
    }
  }
}
