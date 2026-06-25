import { db } from '../../lib/db'
import { aiRequestLog, users, tasks, eq, sql, and } from '@verve/db'
import { callOpenRouter, FREE_MODELS } from '../../lib/openrouter'
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

export class AiService {
  private static async checkBudget(userId: string) {
    const dbUser = await db.select({ ai_requests: users.ai_requests_used_today }).from(users).where(eq(users.id, userId)).then(res => res[0])
    if (dbUser && dbUser.ai_requests >= 50) {
      throw new Error('Daily AI budget exceeded')
    }
  }

  private static async logUsage(userId: string, requestType: any, aiResponse: any, latencyMs: number) {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(aiRequestLog).values({
          user_id: userId,
          request_type: requestType,
          openrouter_model: aiResponse.model_used,
          requested_model: FREE_MODELS.join(','),
          input_tokens: aiResponse.usage.input,
          output_tokens: aiResponse.usage.output,
          latency_ms: latencyMs,
          success: true,
        })
        await tx.update(users).set({ ai_requests_used_today: sql`${users.ai_requests_used_today} + 1` }).where(eq(users.id, userId))
      })
    } catch (e) {
      console.error('Failed to log AI usage', e)
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
    } catch (e) {
      console.error('Failed to log AI failure', e)
    }
  }

  static async generateRoutine(userId: string, body: GenerateRoutineRequest) {
    await this.checkBudget(userId)

    const relevantMemories = await MemoryService.getRelevantMemories(userId, JSON.stringify(body.answers))
    const memoryContext = relevantMemories.length > 0 ? `Past Habits & Memories:\n- ${relevantMemories.join('\n- ')}` : ''

    const systemPrompt = `You are a productivity AI. Generate a customized daily routine based on the user profile. Return JSON strictly matching: { "routine": { "title": "string", "goal": "string" }, "tasks": [ { "title": "string", "priority": "critical|high|medium|low", "scheduled_at": "ISOString", "estimated_duration_minutes": number, "category": "string" } ] }\n\n${memoryContext}`
    const userPrompt = `Profile: ${JSON.stringify(body.profile)}\nAnswers: ${JSON.stringify(body.answers)}`

    const start = Date.now()
    try {
      const aiResponse = await callOpenRouter({
        systemPrompt,
        userPrompt,
        schema: GeneratedRoutineSchema,
      })
      await this.logUsage(userId, 'generate_routine', aiResponse, Date.now() - start)
      return aiResponse.data
    } catch (e: any) {
      await this.logFailure(userId, 'generate_routine', e.message)
      throw e
    }
  }

  static async extractEmail(userId: string, body: ExtractEmailRequest) {
    await this.checkBudget(userId)

    const systemPrompt = `You are a productivity AI that extracts actionable tasks from raw email content. 
STRICT RULES:
1. Return JSON strictly matching the provided schema.
2. If a specific date or time is mentioned, resolve it relative to the 'Current Date/Time' provided in the context. Format as a full ISO-8601 timestamp (e.g., YYYY-MM-DDTHH:mm:ssZ).
3. If NO specific date is implied, omit 'scheduled_at'.
4. Extract an actionable task title.
5. Summarize the email body into a brief 'description' providing context for the task.
6. Infer a 'category' from the semantic meaning of the task (e.g., 'work', 'personal', 'learning').
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
    await this.checkBudget(userId)

    const userTasks = await db.select({
      id: tasks.id,
      title: tasks.title,
      scheduled_at: tasks.scheduled_at,
      priority: tasks.priority,
      is_time_locked: tasks.is_time_locked,
    }).from(tasks).where(and(eq(tasks.user_id, userId), eq(tasks.status, 'not_started')))

    const systemPrompt = `You are an intent parser. Map the user's natural language command to specific calendar actions based on their current tasks. STRICT RULE: Any task with is_time_locked=true is an external calendar event (e.g. from Google Calendar) and CANNOT be moved, canceled, or updated under any circumstances. Output JSON matching an array of actions: { "action": "MOVE"|"CANCEL"|"UPDATE"|"CREATE", "task_id": "uuid(optional)", "new_scheduled_at": "ISOString", "new_title": "string" }`
    const userPrompt = `Command: "${body.command}"\nCurrent Context: ${JSON.stringify(userTasks)}`

    const start = Date.now()
    try {
      const aiResponse = await callOpenRouter({
        systemPrompt,
        userPrompt,
        schema: IntentGraphSchema,
      })

      const validTaskIds = new Set(userTasks.map(t => t.id))
      for (const action of aiResponse.data) {
        if (action.task_id && !validTaskIds.has(action.task_id)) {
          throw new Error(`AI generated invalid task_id: ${action.task_id}`)
        }
      }

      await this.logUsage(userId, 'reschedule', aiResponse, Date.now() - start)
      return aiResponse.data
    } catch (e: any) {
      await this.logFailure(userId, 'reschedule', e.message)
      throw e
    }
  }

  static async processOmnibox(userId: string, body: OmniboxRequest) {
    await this.checkBudget(userId)

    const systemPrompt = `You are a universal AI Omnibox for a calendar app. Map the user's natural language command to an array of specific actions: { "action": "MOVE"|"CANCEL"|"UPDATE"|"CREATE", "task_id": "uuid(optional)", "new_scheduled_at": "ISOString", "new_duration_minutes": number, "new_title": "string", "new_priority": "critical|high|medium|low" }

STRICT RULES:
1. CREATE: For new tasks. Automatically infer priority and category based on semantic meaning (e.g., "urgent bug" -> critical, "groceries" -> low). Calculate 'new_scheduled_at' in the user's timezone if a time is mentioned.
2. MOVE/CANCEL/UPDATE: For modifying existing tasks. NEVER touch tasks where is_time_locked=true.
3. DEFRAGMENT: If the user asks to "defragment", "pack", or "optimize" their calendar, analyze the context. Identify flexible tasks (is_time_locked=false) and shift their 'new_scheduled_at' to form contiguous back-to-back blocks of time, filling in gaps between time-locked events.
4. Output MUST be an array of actions matching the schema.`

    const userPrompt = `Current Local Time: ${body.local_time_string}
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

      const validTaskIds = new Set(body.context.tasks.map(t => t.id))
      for (const action of aiResponse.data) {
        if (action.action !== 'CREATE' && action.task_id && !validTaskIds.has(action.task_id)) {
          throw new Error(`AI generated invalid task_id: ${action.task_id}`)
        }
      }

      await this.logUsage(userId, 'parse_task', aiResponse, Date.now() - start) // Reusing parse_task enum for omnibox usage logging
      return aiResponse.data
    } catch (e: any) {
      await this.logFailure(userId, 'parse_task', e.message)
      throw e
    }
  }

  static async parseTask(userId: string, body: ParseTaskRequest) {
    await this.checkBudget(userId)

    const systemPrompt = `You are a productivity AI that extracts actionable tasks from natural language input.
STRICT RULES:
1. Return JSON strictly matching the provided schema.
2. If a specific date or time is mentioned, resolve it relative to the 'Current User Local Time' and 'User Timezone' provided in the context. You MUST calculate the exact scheduled time in the user's timezone, and return a full ISO-8601 timestamp that includes the timezone offset (e.g., YYYY-MM-DDTHH:mm:ss+05:30) or UTC (Z) equivalent.
3. If NO specific date is implied, omit 'scheduled_at'.
4. Extract an actionable task title. Remove words related to priority (e.g. !high) or category (e.g. #work) or the time from the final title.
5. AUTOMATIC PRIORITIZATION & CATEGORIZATION: You MUST infer the 'priority' (critical, high, medium, low) and 'category' (e.g. work, personal, health) based purely on the semantic meaning of the task description (e.g. "production outage" -> critical/work, "buy milk" -> low/personal).`
    
    const userPrompt = `Current User Local Time: ${body.local_time_string}\nUser Timezone: ${body.timezone}\nRaw Input: "${body.raw_input}"`

    const start = Date.now()
    try {
      const aiResponse = await callOpenRouter({
        systemPrompt,
        userPrompt,
        schema: ParseTaskSchema,
      })
      await this.logUsage(userId, 'parse_task', aiResponse, Date.now() - start)
      return aiResponse.data
    } catch (e: any) {
      await this.logFailure(userId, 'parse_task', e.message)
      throw e
    }
  }
}
