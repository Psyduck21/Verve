import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { db } from '../../lib/db'
import { users, onboardingAnalytics } from '@verve/db'
import { eq } from '@verve/db'
import { OnboardingService } from './onboarding.service'

const OnboardingStepSchema = z.object({
  step: z.number().min(1).max(7),
  data: z.object({
    timezone: z.string().optional(),
    grind_type: z.string().optional(),
    wake_time: z.string().optional(),
    sleep_time: z.string().optional(),
    daily_commitment_minutes: z.number().optional(),
    primary_focus_areas: z.array(z.string()).optional(),
    priority_preference: z.string().optional(),
  }).optional(),
  duration_ms: z.number().optional(),
})

const GenerateRoutineSchema = z.object({
  timezone: z.string(),
  grind_type: z.string(),
  wake_time: z.string(),
  sleep_time: z.string(),
  daily_commitment_minutes: z.number(),
  primary_focus_areas: z.array(z.string()),
  priority_preference: z.string(),
  challenge: z.string().optional(),
})

const CompleteOnboardingSchema = z.object({
  completed_at: z.string().optional(),
  total_duration_ms: z.number().optional(),
  skipped_steps: z.array(z.number()).optional(),
})

export const onboardingRoutes: FastifyPluginAsync = async (app) => {
  // GET /v1/onboarding/status
  app.get('/status', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    
    const profile = await db.select({
      onboarding_step: users.onboarding_step,
      onboarding_completed: users.onboarding_completed,
      onboarding_started_at: users.onboarding_started_at,
      onboarding_completed_at: users.onboarding_completed_at,
      onboarding_skipped_steps: users.onboarding_skipped_steps,
      timezone: users.timezone,
      grind_type: users.grind_type,
      wake_time: users.wake_time,
      sleep_time: users.sleep_time,
      daily_commitment_minutes: users.daily_commitment_minutes,
      primary_focus_areas: users.primary_focus_areas,
      priority_preference: users.priority_preference,
    }).from(users).where(eq(users.id, user.id))
    
    if (!profile.length) {
      return reply.status(404).send({ success: false, error: 'User not found' })
    }
    
    return reply.send({ 
      success: true, 
      data: {
        step: profile[0].onboarding_step,
        completed: profile[0].onboarding_completed,
        started_at: profile[0].onboarding_started_at,
        completed_at: profile[0].onboarding_completed_at,
        skipped_steps: profile[0].onboarding_skipped_steps,
        data: {
          timezone: profile[0].timezone,
          grind_type: profile[0].grind_type,
          wake_time: profile[0].wake_time,
          sleep_time: profile[0].sleep_time,
          daily_commitment_minutes: profile[0].daily_commitment_minutes,
          primary_focus_areas: profile[0].primary_focus_areas,
          priority_preference: profile[0].priority_preference,
        }
      }
    })
  })

  // POST /v1/onboarding/step/:number
  app.post('/step/:number', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const stepNumber = parseInt((req.params as { number: string }).number)
    
    const body = req.body as any
    const parsed = OnboardingStepSchema.safeParse({ 
      step: stepNumber, 
      data: body.data,
      duration_ms: body.duration_ms,
    })
    
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    const { step, data, duration_ms } = parsed.data

    // Log analytics
    await db.insert(onboardingAnalytics).values({
      user_id: user.id,
      step_number: step,
      action: 'completed',
      duration_ms,
      metadata: data || {},
    })

    // Update user profile with step data
    const updateData: any = { onboarding_step: step }
    if (data) {
      Object.assign(updateData, data)
    }

    // Set onboarding_started_at if first step
    if (step === 1) {
      updateData.onboarding_started_at = new Date()
    }

    const updated = await db.update(users)
      .set(updateData)
      .where(eq(users.id, user.id))
      .returning()

    return reply.send({ success: true, data: updated[0] })
  })

  // POST /v1/onboarding/generate-routine
  app.post('/generate-routine', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    
    const parsed = GenerateRoutineSchema.safeParse(req.body)
    
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    try {
      const tasks = await OnboardingService.generateOnboardingRoutine(user.id, parsed.data)
      return reply.send({ success: true, data: tasks })
    } catch (e: any) {
      // If AI fails, return template-based fallback
      console.error('AI routine generation failed, using fallback:', e.message)
      const fallbackTasks = OnboardingService.generateTemplateRoutine(parsed.data)
      return reply.send({ success: true, data: fallbackTasks, fallback: true })
    }
  })

  // POST /v1/onboarding/complete
  app.post('/complete', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    
    const parsed = CompleteOnboardingSchema.safeParse(req.body)
    
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues })
    }

    const { completed_at, total_duration_ms, skipped_steps } = parsed.data

    // Log completion analytics
    await db.insert(onboardingAnalytics).values({
      user_id: user.id,
      step_number: 7,
      action: 'completed',
      duration_ms: total_duration_ms,
      metadata: { skipped_steps },
    })

    // Update user
    const updated = await db.update(users)
      .set({
        onboarding_completed: true,
        onboarding_step: 7,
        onboarding_completed_at: completed_at ? new Date(completed_at) : new Date(),
        onboarding_skipped_steps: skipped_steps || [],
      })
      .where(eq(users.id, user.id))
      .returning()

    return reply.send({ success: true, data: updated[0] })
  })

  // POST /v1/onboarding/skip
  app.post('/skip', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!
    const { skip_from_step, reason } = req.body as { skip_from_step?: number, reason?: string }

    const profile = await db.select({
      onboarding_step: users.onboarding_step,
      onboarding_skipped_steps: users.onboarding_skipped_steps,
    }).from(users).where(eq(users.id, user.id))

    if (!profile.length) {
      return reply.status(404).send({ success: false, error: 'User not found' })
    }

    const currentStep = profile[0].onboarding_step
    const skippedSteps = profile[0].onboarding_skipped_steps as number[]

    // Calculate steps to skip
    const stepsToSkip = skip_from_step 
      ? Array.from({ length: 8 - skip_from_step }, (_, i) => skip_from_step + i)
      : []

    // Log skip analytics
    for (const step of stepsToSkip) {
      await db.insert(onboardingAnalytics).values({
        user_id: user.id,
        step_number: step,
        action: 'skipped',
        metadata: { reason },
      })
    }

    // Update user
    const updated = await db.update(users)
      .set({
        onboarding_completed: true,
        onboarding_step: 7,
        onboarding_completed_at: new Date(),
        onboarding_skipped_steps: [...skippedSteps, ...stepsToSkip],
      })
      .where(eq(users.id, user.id))
      .returning()

    return reply.send({ success: true, data: updated[0] })
  })

  // POST /v1/onboarding/reset (Admin only or after 7 days)
  app.post('/reset', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user!

    // Check if user can reset (e.g., after 7 days of completion)
    const profile = await db.select({
      onboarding_completed_at: users.onboarding_completed_at,
    }).from(users).where(eq(users.id, user.id))

    if (!profile.length) {
      return reply.status(404).send({ success: false, error: 'User not found' })
    }

    const completedAt = profile[0].onboarding_completed_at
    if (completedAt) {
      const daysSinceCompletion = Math.floor(
        (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceCompletion < 7) {
        return reply.status(403).send({ 
          success: false, 
          error: 'Onboarding can only be reset after 7 days of completion' 
        })
      }
    }

    // Reset onboarding
    const updated = await db.update(users)
      .set({
        onboarding_step: 0,
        onboarding_completed: false,
        onboarding_started_at: null,
        onboarding_completed_at: null,
        onboarding_skipped_steps: [],
      })
      .where(eq(users.id, user.id))
      .returning()

    return reply.send({ success: true, data: updated[0] })
  })
}
