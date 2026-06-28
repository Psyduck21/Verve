import { db } from '../../lib/db'
import { callOpenRouter, FREE_MODELS } from '../../lib/openrouter'
import { tasks, routines, users, eq, and, isNull, sql, aiRequestLog } from '@verve/db'
import {
  AssistantDraftPlanSchema,
  AssistantExecuteRequest,
  AssistantExecuteRequestSchema,
  AssistantPlanRequest,
} from '@verve/shared'
import { TasksService } from '../tasks/tasks.service'
import { MemoryService } from './memory.service'

const SUPPORTED_ASSISTANT_ACTION_TYPES = new Set([
  'CREATE_ROUTINE',
  'CREATE_TASK',
  'SCHEDULE_TASK',
  'UPDATE_TASK',
  'RESOLVE_CONFLICT',
])

export class AssistantService {
  static async checkBudgetAndIncrement(userId: string) {
    return await db.transaction(async (tx) => {
      const dbUser = await tx
        .select({ ai_requests: users.ai_requests_used_today })
        .from(users)
        .where(eq(users.id, userId))
        .for('update')

      const user = dbUser[0]
      if (!user) {
        throw new Error('User not found')
      }

      if (user.ai_requests >= 50) {
        throw new Error('Daily AI budget exceeded')
      }

      await tx
        .update(users)
        .set({ ai_requests_used_today: sql`${users.ai_requests_used_today} + 1` })
        .where(eq(users.id, userId))
    })
  }

  private static async createRoutine(userId: string, title?: string, goal?: string) {
    const routineTitle = title?.trim() || 'New Routine'
    const routineGoal = goal?.trim() || ''

    const [maxSortOrder] = await db
      .select({ max_order: sql<number>`max(${routines.sort_order})` })
      .from(routines)
      .where(and(eq(routines.user_id, userId), isNull(routines.deleted_at)))

    const nextSortOrder = (maxSortOrder?.max_order || 0) + 1
    const [newRoutine] = await db
      .insert(routines)
      .values({
        user_id: userId,
        title: routineTitle,
        goal: routineGoal || null,
        is_active: true,
        sort_order: nextSortOrder,
      })
      .returning()

    return newRoutine
  }

  static async buildDraftPlan(userId: string, body: AssistantPlanRequest, retryCount: number = 0): Promise<any> {
    await this.checkBudgetAndIncrement(userId)

    const taskContext = body.context?.tasks?.slice(0, 20) || []
    const taskSummary = taskContext.length
      ? taskContext.map((task) => {
          const timeLockInfo = task.is_time_locked ? ' [TIME-LOCKED: Cannot be modified]' : ''
          return `- ${task.title}${task.id ? ` (${task.id})` : ''}${timeLockInfo}`
        }).join('\n')
      : 'No active task context provided.'

    // Analyze calendar state for suggestions
    const calendarState = this.analyzeCalendarState(taskContext)
    const stateSuggestions = calendarState.suggestions.length > 0
      ? `\n\nCalendar Analysis & Suggestions:\n${calendarState.suggestions.join('\n')}`
      : ''

    // Integrate memory for context awareness
    const relevantMemories = await MemoryService.getRelevantMemories(userId, body.prompt, 5)
    const memoryContext = relevantMemories.length > 0 
      ? `\n\nPast Context & Memories:\n${relevantMemories.map(m => `- ${m}`).join('\n')}`
      : ''

    // Add conversation history if provided
    const conversationHistory = body.context?.conversation_history || []
    const historyContext = conversationHistory.length > 0
      ? `\n\nConversation History:\n${conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}`
      : ''

    const systemPrompt = `You are Verve AI, an intelligent scheduling assistant. Generate a draft assistant plan based on the user's request. Output JSON strictly matching the schema: { "plan_id": string, "summary": string, "actions": [ { "type": "CREATE_ROUTINE" | "CREATE_TASK" | "SCHEDULE_TASK" | "UPDATE_TASK" | "RESOLVE_CONFLICT", "title": string, "details": string, "payload": { ... } } ] , "needs_confirmation": true }.

CRITICAL RULES:
1. For UPDATE_TASK and SCHEDULE_TASK actions, you MUST include the exact task_id from the current tasks list (shown in parentheses). Never invent task IDs.
2. If you cannot find a matching task_id for a task mentioned in the user's request, use CREATE_TASK instead or ask for clarification.
3. ALWAYS prefer rescheduling (SCHEDULE_TASK) over deleting. Do not generate deletion actions.
4. NEVER attempt to UPDATE or SCHEDULE tasks marked as [TIME-LOCKED]. These are external calendar events (e.g., Google Calendar) that cannot be modified. Skip them or work around them.
5. When rescheduling, provide a specific scheduled_at time (ISO format) in the payload.
6. Use the user's current tasks, memories, conversation history, and calendar state analysis for contextual awareness.
7. Do not include any fields outside the specified schema.`

    const userPrompt = `User request: ${body.prompt}\n\nCurrent tasks:\n${taskSummary}${stateSuggestions}${memoryContext}${historyContext}`

    const start = Date.now()
    try {
      const aiResponse = await callOpenRouter({
        systemPrompt,
        userPrompt,
        schema: AssistantDraftPlanSchema,
        models: FREE_MODELS,
      })

      const latencyMs = Date.now() - start
      
      // Log usage for monitoring
      try {
        await db.insert(aiRequestLog).values({
          user_id: userId,
          request_type: 'assistant_plan',
          openrouter_model: aiResponse.model_used,
          requested_model: FREE_MODELS.join(','),
          input_tokens: aiResponse.usage.input,
          output_tokens: aiResponse.usage.output,
          latency_ms: latencyMs,
          success: true,
        })
      } catch (logError) {
        console.error('Failed to log assistant plan usage:', logError)
      }

      const result = AssistantDraftPlanSchema.parse(aiResponse.data)
      
      // Log plan metadata for analytics
      console.log(`[Assistant Plan] User: ${userId}, Actions: ${result.actions?.length}, Latency: ${latencyMs}ms, Model: ${aiResponse.model_used}`)
      
      return result
    } catch (error: any) {
      const latencyMs = Date.now() - start
      
      // Log failure for monitoring
      try {
        await db.insert(aiRequestLog).values({
          user_id: userId,
          request_type: 'assistant_plan',
          openrouter_model: 'unknown',
          requested_model: FREE_MODELS.join(','),
          success: false,
          error_code: error.message,
          latency_ms: latencyMs,
        })
      } catch (logError) {
        console.error('Failed to log assistant plan failure:', logError)
      }

      console.error(`[Assistant Plan Error] User: ${userId}, Error: ${error.message}, Retry: ${retryCount}`)
      
      // Retry logic for transient errors
      if (retryCount < 2 && (error.message.includes('rate limit') || error.message.includes('timeout') || error.message.includes('502'))) {
        console.log(`Retrying plan generation (attempt ${retryCount + 1}/3)`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))) // Exponential backoff
        return this.buildDraftPlan(userId, body, retryCount + 1)
      }
      throw error
    }
  }

  private static analyzeCalendarState(tasks: any[]): { suggestions: string[] } {
    const suggestions: string[] = []
    
    if (!tasks || tasks.length === 0) {
      suggestions.push("- Calendar is empty. Consider creating a daily routine.")
      return { suggestions }
    }

    const notStartedTasks = tasks.filter(t => t.status === 'not_started')
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
    
    if (notStartedTasks.length > 10) {
      suggestions.push(`- You have ${notStartedTasks.length} pending tasks. Consider prioritizing or rescheduling some.`)
    }
    
    if (inProgressTasks.length > 5) {
      suggestions.push(`- You have ${inProgressTasks.length} tasks in progress. Consider completing some before starting new ones.`)
    }

    // Check for potential conflicts (tasks with similar titles)
    const taskTitles = tasks.map(t => t.title.toLowerCase())
    const duplicates = taskTitles.filter((title, index) => taskTitles.indexOf(title) !== index)
    if (duplicates.length > 0) {
      suggestions.push("- You have duplicate task names. Consider consolidating or renaming them.")
    }

    return { suggestions }
  }

  static async executePlan(userId: string, body: AssistantExecuteRequest) {
    const start = Date.now()
    const validated = AssistantExecuteRequestSchema.parse(body)

    const unsupportedActions = validated.actions
      .map((action) => action.type)
      .filter((type) => !SUPPORTED_ASSISTANT_ACTION_TYPES.has(type))

    if (unsupportedActions.length) {
      throw new Error(`Unsupported action type(s): ${[...new Set(unsupportedActions)].join(', ')}`)
    }

    // Validate task IDs and check time-locked events before execution
    const userTasks = await db.select({ 
      id: tasks.id, 
      title: tasks.title,
      is_time_locked: tasks.is_time_locked,
      scheduled_at: tasks.scheduled_at
    })
      .from(tasks)
      .where(eq(tasks.user_id, userId))
    
    const validTaskIds = new Set(userTasks.map(t => t.id))
    const timeLockedTasks = new Map(userTasks.filter(t => t.is_time_locked).map(t => [t.id, t.title]))
    
    for (const action of validated.actions) {
      if ((action.type === 'UPDATE_TASK' || action.type === 'SCHEDULE_TASK')) {
        if (!action.payload?.task_id) {
          throw new Error(`Missing task_id for ${action.type}`)
        }
        if (!validTaskIds.has(action.payload.task_id)) {
          throw new Error(`Invalid task_id for ${action.type}: ${action.payload.task_id}. Task does not exist or you don't have access.`)
        }
        
        // Check for time-locked events (external calendar events)
        if (timeLockedTasks.has(action.payload.task_id)) {
          const taskTitle = timeLockedTasks.get(action.payload.task_id)
          throw new Error(`Cannot modify "${taskTitle}" - it's a time-locked external calendar event and cannot be moved, deleted, or updated.`)
        }
      }
    }

    const results: Array<{ action: string; success: boolean; message: string }> = []
    let currentRoutineId: string | null = null

    for (const action of validated.actions) {
      try {
        switch (action.type) {
          case 'CREATE_ROUTINE': {
            const routine = await this.createRoutine(userId, action.payload?.routine_title || action.payload?.title, action.payload?.routine_goal)
            currentRoutineId = routine.id
            results.push({ action: action.type, success: true, message: `Created routine ${routine.title}` })
            break
          }
          case 'CREATE_TASK': {
            const taskPayload: any = {
              title: action.payload?.title || action.title,
              description: action.payload?.description || null,
              priority: action.payload?.priority,
              category: action.payload?.category,
              estimated_duration_minutes: action.payload?.estimated_duration_minutes,
              scheduled_at: action.payload?.scheduled_at,
              routine_id: action.payload?.routine_id || currentRoutineId,
            }
            const createdTask = await TasksService.createTask(userId, taskPayload)
            results.push({ action: action.type, success: true, message: `Created task ${createdTask.title}` })
            break
          }
          case 'SCHEDULE_TASK': {
            if (!action.payload?.task_id || !action.payload?.scheduled_at) {
              throw new Error('Missing task_id or scheduled_at for SCHEDULE_TASK')
            }
            const updatedTask = await TasksService.updateTask(userId, action.payload.task_id, {
              scheduled_at: action.payload.scheduled_at,
            })
            results.push({ action: action.type, success: true, message: `Scheduled task ${updatedTask.title}` })
            break
          }
          case 'UPDATE_TASK': {
            if (!action.payload?.task_id) {
              throw new Error('Missing task_id for UPDATE_TASK')
            }
            const updates: any = {}
            if (action.payload.title) updates.title = action.payload.title
            if (action.payload.description) updates.description = action.payload.description
            if (action.payload.priority) updates.priority = action.payload.priority
            if (action.payload.category) updates.category = action.payload.category
            if (action.payload.scheduled_at) updates.scheduled_at = action.payload.scheduled_at
            if (action.payload.estimated_duration_minutes) updates.estimated_duration_minutes = action.payload.estimated_duration_minutes
            const updatedTask = await TasksService.updateTask(userId, action.payload.task_id, updates)
            results.push({ action: action.type, success: true, message: `Updated task ${updatedTask.title}` })
            break
          }
          case 'RESOLVE_CONFLICT': {
            results.push({ action: action.type, success: true, message: 'Conflict resolution is acknowledged. No automatic action taken in this MVP.' })
            break
          }
          default: {
            throw new Error(`Unsupported action type: ${action.type}`)
          }
        }
      } catch (error: any) {
        results.push({ action: action.type, success: false, message: error.message || 'Unknown error' })
      }
    }

    const latencyMs = Date.now() - start
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    // Log execution for monitoring
    try {
      await db.insert(aiRequestLog).values({
        user_id: userId,
        request_type: 'assistant_execute',
        openrouter_model: 'n/a',
        requested_model: 'n/a',
        input_tokens: 0,
        output_tokens: 0,
        latency_ms: latencyMs,
        success: failed === 0,
        error_code: failed > 0 ? `${failed} actions failed` : undefined,
      })
    } catch (logError) {
      console.error('Failed to log assistant execute usage:', logError)
    }

    console.log(`[Assistant Execute] User: ${userId}, Actions: ${validated.actions.length}, Success: ${successful}, Failed: ${failed}, Latency: ${latencyMs}ms`)

    return { plan_id: validated.plan_id, results }
  }
}
