import { db } from '../../lib/db'
import { users, eq } from '@verve/db'
import { redis } from '../../lib/redis'
import { logger } from '../../lib/logger'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  timezone: string
  wake_time: string
  sleep_time: string
  daily_commitment_minutes: number
  grind_type: string
  primary_focus_areas: string[]
  priority_preference: string
  onboarding_completed: boolean
}

export class UserProfileService {
  private static readonly CACHE_PREFIX = 'user_profile:'
  private static readonly CACHE_TTL = 3600 // 1 hour

  /**
   * Fetch user profile with Redis caching
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Try cache first
      const cacheKey = `${this.CACHE_PREFIX}${userId}`
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached) as UserProfile
      }

      // Fetch from database
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          email: true,
          full_name: true,
          timezone: true,
          wake_time: true,
          sleep_time: true,
          daily_commitment_minutes: true,
          grind_type: true,
          primary_focus_areas: true,
          priority_preference: true,
          onboarding_completed: true,
        },
      })

      if (!user) {
        return null
      }

      const profile: UserProfile = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        timezone: user.timezone || 'UTC',
        wake_time: user.wake_time,
        sleep_time: user.sleep_time,
        daily_commitment_minutes: user.daily_commitment_minutes,
        grind_type: user.grind_type,
        primary_focus_areas: user.primary_focus_areas as string[],
        priority_preference: user.priority_preference,
        onboarding_completed: user.onboarding_completed,
      }

      // Cache the result
      await redis.set(cacheKey, JSON.stringify(profile), 'EX', this.CACHE_TTL)

      return profile
    } catch (error) {
      logger.error('Failed to fetch user profile', error as Error)
      return null
    }
  }

  /**
   * Invalidate cache for a specific user
   */
  static async invalidateCache(userId: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${userId}`
      await redis.del(cacheKey)
    } catch (error) {
      logger.error('Failed to invalidate user profile cache', error as Error)
    }
  }

  /**
   * Get formatted user context for AI prompts
   */
  static async getAIContext(userId: string): Promise<string> {
    const profile = await this.getUserProfile(userId)
    if (!profile) {
      return ''
    }

    return `
USER PROFILE:
- Name: ${profile.full_name || 'User'}
- Timezone: ${profile.timezone}
- Wake Time: ${profile.wake_time}
- Sleep Time: ${profile.sleep_time}
- Daily Commitment: ${profile.daily_commitment_minutes} minutes
- Schedule Type: ${profile.grind_type}
- Focus Areas: ${profile.primary_focus_areas.join(', ') || 'None specified'}
- Priority Preference: ${profile.priority_preference}
- Onboarding Completed: ${profile.onboarding_completed}

SCHEDULING CONSTRAINTS:
- All tasks MUST be scheduled between ${profile.wake_time} and ${profile.sleep_time}
- Work tasks should prioritize business hours when possible
- Personal tasks can be scheduled during any awake hours
- Health tasks should respect user's daily commitment limits
`
  }

  /**
   * Validate if a scheduled time is within user's awake hours
   */
  static async isValidScheduleTime(userId: string, scheduledAt: string): Promise<boolean> {
    const profile = await this.getUserProfile(userId)
    if (!profile) {
      return true // Default to valid if profile not found
    }

    const scheduledDate = new Date(scheduledAt)
    const [wakeHour, wakeMinute] = profile.wake_time.split(':').map(Number)
    const [sleepHour, sleepMinute] = profile.sleep_time.split(':').map(Number)

    const scheduledMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes()
    const wakeMinutes = wakeHour * 60 + wakeMinute
    const sleepMinutes = sleepHour * 60 + sleepMinute

    // Check if time is within wake/sleep window
    if (sleepMinutes > wakeMinutes) {
      // Normal case: wake (e.g., 9:00) to sleep (e.g., 22:00)
      return scheduledMinutes >= wakeMinutes && scheduledMinutes < sleepMinutes
    } else {
      // Overnight case: wake (e.g., 22:00) to sleep (e.g., 9:00 next day)
      return scheduledMinutes >= wakeMinutes || scheduledMinutes < sleepMinutes
    }
  }

  /**
   * Get suggested work hours based on grind type
   */
  static getWorkHours(grindType: string): { start: string; end: string } {
    const workHoursMap: Record<string, { start: string; end: string }> = {
      'early_bird': { start: '06:00:00', end: '14:00:00' },
      '9_to_5': { start: '09:00:00', end: '17:00:00' },
      'night_owl': { start: '12:00:00', end: '20:00:00' },
      'flexible': { start: '09:00:00', end: '17:00:00' },
      'shift_worker': { start: '09:00:00', end: '17:00:00' },
    }

    return workHoursMap[grindType] || { start: '09:00:00', end: '17:00:00' }
  }
}
