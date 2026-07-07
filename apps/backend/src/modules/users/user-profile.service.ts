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
  weekend_warrior: boolean
  primary_focus_areas: string[]
  priority_preference: string
  challenge?: string
  buffer_preference?: string
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
        return JSON.parse(cached as string) as UserProfile
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
          weekend_warrior: true,
          primary_focus_areas: true,
          priority_preference: true,
          challenge: true,
          buffer_preference: true,
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
        weekend_warrior: user.weekend_warrior || false,
        primary_focus_areas: user.primary_focus_areas as string[],
        priority_preference: user.priority_preference,
        challenge: user.challenge,
        buffer_preference: user.buffer_preference,
        onboarding_completed: user.onboarding_completed,
      }

      // Cache the result
      await redis.set(cacheKey, JSON.stringify(profile))
      await redis.expire(cacheKey, this.CACHE_TTL)

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
- Weekend Warrior: ${profile.weekend_warrior ? 'Yes' : 'No'}
- Focus Areas: ${profile.primary_focus_areas.join(', ') || 'None specified'}
- Priority Preference: ${profile.priority_preference}
- Challenges: ${profile.challenge || 'None specified'}
- Buffer Preference: ${profile.buffer_preference || 'Flexible'}
- Onboarding Completed: ${profile.onboarding_completed}

SCHEDULING CONSTRAINTS:
- All tasks MUST be scheduled between ${profile.wake_time} and ${profile.sleep_time}
- ${profile.weekend_warrior ? 'User works on weekends - schedule tasks on Saturday and Sunday' : 'User does NOT work on weekends - avoid scheduling tasks on Saturday and Sunday'}
- ${profile.buffer_preference === 'back_to_back' ? 'User prefers back-to-back tasks for maximum efficiency - minimize gaps between tasks' : profile.buffer_preference === 'buffer_time' ? 'User prefers 5-10 minute buffer time between tasks for transitions' : 'User prefers flexible task spacing - let AI decide based on context'}
- Work tasks should prioritize business hours when possible
- Personal tasks can be scheduled during any awake hours
- Health tasks should respect user's daily commitment limits
`
  }

  /**
   * Validate if a scheduled time is within user's awake hours
   */
  static isValidScheduleTime(userId: string, scheduledAt: string): boolean {
    // For synchronous validation, we'll do a simple time check without fetching profile
    // This is a fallback - the profile should be passed in for accurate validation
    const scheduledDate = new Date(scheduledAt)
    const scheduledMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes()

    // Default awake hours: 9:00 to 22:00 (could be made configurable)
    const defaultWakeMinutes = 9 * 60 // 9:00 AM
    const defaultSleepMinutes = 22 * 60 // 10:00 PM

    // Check if time is within default wake/sleep window
    return scheduledMinutes >= defaultWakeMinutes && scheduledMinutes < defaultSleepMinutes
  }

  /**
   * Validate if a scheduled time is within user's awake hours (async version with profile)
   */
  static async isValidScheduleTimeWithProfile(userId: string, scheduledAt: string): Promise<boolean> {
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

  /**
   * Check if a date falls on a weekend (Saturday or Sunday)
   */
  static isWeekend(date: Date): boolean {
    const day = date.getDay()
    return day === 0 || day === 6 // 0 = Sunday, 6 = Saturday
  }

  /**
   * Check if scheduling is allowed for a given date based on weekend warrior preference
   */
  static async isWeekendSchedulingAllowed(userId: string, scheduledDate: Date): Promise<boolean> {
    const profile = await this.getUserProfile(userId)
    if (!profile) {
      return true // Default to allowed if profile not found
    }

    // If it's not a weekend, always allow
    if (!this.isWeekend(scheduledDate)) {
      return true
    }

    // If it's a weekend, check if user is a weekend warrior
    return profile.weekend_warrior
  }
}
