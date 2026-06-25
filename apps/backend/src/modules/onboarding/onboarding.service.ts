import { db } from '../../lib/db'
import { users, tasks, aiRequestLog } from '@verve/db'
import { eq, sql } from '@verve/db'
import { callOpenRouter, FREE_MODELS } from '../../lib/openrouter'
import { GeneratedRoutineSchema } from '@verve/shared'
import { z } from 'zod'

// Simplified schema for onboarding routine (fewer fields to reduce output tokens)
const OnboardingRoutineSchema = z.object({
  tasks: z.array(z.object({
    title: z.string().min(1).max(100),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    scheduled_at: z.string().datetime(),
    estimated_duration_minutes: z.number().int().min(15).max(120),
    category: z.string(),
  })).min(3).max(7),
})

export class OnboardingService {
  /**
   * Generate a simple onboarding routine using collected data
   * Optimized for minimal token usage:
   * - No memory context (new users have none)
   * - Compact prompts
   * - Limited task count (3-7 tasks)
   * - Tomorrow only
   */
  static async generateOnboardingRoutine(userId: string, profile: {
    timezone: string
    grind_type: string
    wake_time: string
    sleep_time: string
    daily_commitment_minutes: number
    primary_focus_areas: string[]
    priority_preference: string
    challenge?: string
  }) {
    // Check budget (reuse existing budget check)
    const dbUser = await db.select({ ai_requests: users.ai_requests_used_today }).from(users).where(eq(users.id, userId)).then(res => res[0])
    if (dbUser && dbUser.ai_requests >= 50) {
      throw new Error('Daily AI budget exceeded')
    }

    // Calculate tomorrow's date in user's timezone
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // Extract wake hour for scheduling
    const wakeHour = parseInt(profile.wake_time.split(':')[0])

    // Compact system prompt (minimal tokens)
    const systemPrompt = `Generate 3-7 tasks for tomorrow (${tomorrowStr}). 
Use user's schedule: wake ${profile.wake_time}, sleep ${profile.sleep_time}, ${profile.daily_commitment_minutes}min focus time.
Focus areas: ${profile.primary_focus_areas.join(', ')}. 
Priority: ${profile.priority_preference}.
Return JSON: { "tasks": [{ "title": "string", "priority": "critical|high|medium|low", "scheduled_at": "ISO", "estimated_duration_minutes": number, "category": "string" }] }`

    // Compact user prompt (minimal tokens)
    let userPrompt = `Timezone: ${profile.timezone}. Schedule type: ${profile.grind_type}.`
    if (profile.challenge) {
      userPrompt += ` Challenge: ${profile.challenge}.`
    }

    const start = Date.now()

    try {
      const aiResponse = await callOpenRouter({
        systemPrompt,
        userPrompt,
        schema: OnboardingRoutineSchema,
      })

      // Log usage (reuse existing generate_routine type)
      await db.transaction(async (tx) => {
        await tx.insert(aiRequestLog).values({
          user_id: userId,
          request_type: 'generate_routine', // Reuse existing type
          openrouter_model: aiResponse.model_used,
          requested_model: FREE_MODELS.join(','),
          input_tokens: aiResponse.usage.input,
          output_tokens: aiResponse.usage.output,
          latency_ms: Date.now() - start,
          success: true,
        })
        await tx.update(users).set({ ai_requests_used_today: sql`${users.ai_requests_used_today} + 1` }).where(eq(users.id, userId))
      })

      return aiResponse.data.tasks
    } catch (e: any) {
      // Log failure
      await db.insert(aiRequestLog).values({
        user_id: userId,
        request_type: 'generate_routine', // Reuse existing type
        openrouter_model: 'unknown',
        requested_model: FREE_MODELS.join(','),
        success: false,
        error_code: e.message,
      })
      throw e
    }
  }

  /**
   * Fallback: Generate template-based routine if AI fails
   * This ensures onboarding can complete even if AI is down
   */
  static generateTemplateRoutine(profile: {
    timezone: string
    wake_time: string
    daily_commitment_minutes: number
    primary_focus_areas: string[]
  }) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const wakeHour = parseInt(profile.wake_time.split(':')[0])
    
    const tasks = []
    const focusArea = profile.primary_focus_areas[0] || 'work'
    const duration = Math.min(profile.daily_commitment_minutes / 3, 60) // Split into 3 tasks max

    // Task 1: Morning focus
    tasks.push({
      title: `Morning ${focusArea} focus`,
      priority: 'high',
      scheduled_at: `${tomorrowStr}T${String(wakeHour).padStart(2, '0')}:00:00`,
      estimated_duration_minutes: duration,
      category: focusArea,
    })

    // Task 2: Midday check-in
    tasks.push({
      title: 'Review progress & plan next steps',
      priority: 'medium',
      scheduled_at: `${tomorrowStr}T${String(wakeHour + 4).padStart(2, '0')}:00:00`,
      estimated_duration_minutes: 15,
      category: 'planning',
    })

    // Task 3: Evening wrap-up
    tasks.push({
      title: 'Daily review & tomorrow planning',
      priority: 'low',
      scheduled_at: `${tomorrowStr}T${String(wakeHour + 8).padStart(2, '0')}:00:00`,
      estimated_duration_minutes: 15,
      category: 'planning',
    })

    return tasks
  }
}
