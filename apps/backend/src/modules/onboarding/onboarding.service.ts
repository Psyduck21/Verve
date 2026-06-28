import { db } from '../../lib/db'
import { users, tasks, aiRequestLog } from '@verve/db'
import { eq, sql } from '@verve/db'
import { callOpenRouter, FREE_MODELS } from '../../lib/openrouter'
import { GeneratedRoutineSchema } from '@verve/shared'
import { z } from 'zod'

// Schema for an array of 3 distinct routines, each with its own set of tasks
const OnboardingRoutineSchema = z.object({
  routines: z.array(z.object({
    title: z.string().min(1).max(100),
    goal: z.string().max(200),
    icon: z.string().describe("A Lucide icon name (e.g. 'Briefcase', 'Brain', 'Coffee')"),
    color: z.string().describe("A hex color code (e.g. '#3b82f6')"),
    tasks: z.array(z.object({
      title: z.string().min(1).max(100),
      priority: z.enum(['critical', 'high', 'medium', 'low']),
      estimated_duration_minutes: z.number().int().min(15).max(120),
      category: z.string(),
    })).min(3).max(7),
  })).length(3),
})

export class OnboardingService {
  /**
   * Generate 3 distinct routine options using collected data
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
    // Check budget
    const dbUser = await db.select({ ai_requests: users.ai_requests_used_today }).from(users).where(eq(users.id, userId)).then(res => res[0])
    if (dbUser && dbUser.ai_requests >= 50) {
      throw new Error('Daily AI budget exceeded')
    }

    const systemPrompt = `Generate exactly 3 distinct Daily Routine options based on the user's profile.
Use user's schedule: wake ${profile.wake_time}, sleep ${profile.sleep_time}, ${profile.daily_commitment_minutes}min focus time.
Focus areas: ${profile.primary_focus_areas.join(', ')}. 
Priority: ${profile.priority_preference}.
Make each routine unique (e.g., one balanced, one intense, one flexible). Do NOT generate absolute 'scheduled_at' times for tasks; just use duration and category.
Return JSON strictly matching: { "routines": [ { "title": "string", "goal": "string", "icon": "string", "color": "#hex", "tasks": [ { "title": "string", "priority": "critical|high|medium|low", "estimated_duration_minutes": number, "category": "string" } ] } ] }`

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

      // Log usage
      await db.transaction(async (tx) => {
        await tx.insert(aiRequestLog).values({
          user_id: userId,
          request_type: 'generate_routine',
          openrouter_model: aiResponse.model_used,
          requested_model: FREE_MODELS.join(','),
          input_tokens: aiResponse.usage.input,
          output_tokens: aiResponse.usage.output,
          latency_ms: Date.now() - start,
          success: true,
        })
        await tx.update(users).set({ ai_requests_used_today: sql`${users.ai_requests_used_today} + 1` }).where(eq(users.id, userId))
      })

      return aiResponse.data.routines
    } catch (e: any) {
      // Log failure
      await db.insert(aiRequestLog).values({
        user_id: userId,
        request_type: 'generate_routine',
        openrouter_model: 'unknown',
        requested_model: FREE_MODELS.join(','),
        success: false,
        error_code: e.message,
      })
      throw e
    }
  }

  /**
   * Fallback: Generate template-based routines if AI fails
   */
  static generateTemplateRoutine(profile: {
    timezone: string
    wake_time: string
    daily_commitment_minutes: number
    primary_focus_areas: string[]
  }) {
    const focusArea = profile.primary_focus_areas[0] || 'work'
    const duration = Math.min(profile.daily_commitment_minutes / 3, 60)

    return [
      {
        title: "Balanced Flow",
        goal: "A steady pace for sustained energy",
        icon: "Scale",
        color: "#3b82f6",
        tasks: [
          { title: `Morning ${focusArea} focus`, priority: 'high', estimated_duration_minutes: duration, category: focusArea },
          { title: 'Review progress & plan next steps', priority: 'medium', estimated_duration_minutes: 15, category: 'planning' },
          { title: 'Daily wrap-up', priority: 'low', estimated_duration_minutes: 15, category: 'planning' }
        ]
      },
      {
        title: "Intense Grind",
        goal: "Maximize deep work blocks",
        icon: "Zap",
        color: "#ef4444",
        tasks: [
          { title: `Deep ${focusArea} block 1`, priority: 'critical', estimated_duration_minutes: 60, category: focusArea },
          { title: `Deep ${focusArea} block 2`, priority: 'high', estimated_duration_minutes: 60, category: focusArea }
        ]
      },
      {
        title: "Flexible Day",
        goal: "Light structure for creative flow",
        icon: "Wind",
        color: "#10b981",
        tasks: [
          { title: 'Morning ideation', priority: 'medium', estimated_duration_minutes: 30, category: 'creative' },
          { title: `Core ${focusArea} task`, priority: 'high', estimated_duration_minutes: duration, category: focusArea }
        ]
      }
    ]
  }
}
