import { createClient } from '@/utils/supabase/server'

export interface OnboardingStatus {
  completed: boolean
  step?: number
}

// Simple in-memory cache for onboarding status (per request lifecycle)
let cachedStatus: OnboardingStatus | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Centralized function to check onboarding status from the backend
 * @returns Onboarding status or null if check fails
 */
export async function checkOnboardingStatus(): Promise<OnboardingStatus | null> {
  const now = Date.now()

  // Return cached status if still valid
  if (cachedStatus && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedStatus
  }

  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return null
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/onboarding/status`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      // Add cache control to prevent browser caching
      cache: 'no-store',
    })

    if (response.ok) {
      const data = await response.json()
      const status = {
        completed: data.data?.completed || false,
        step: data.data?.step,
      }

      // Cache the result
      cachedStatus = status
      cacheTimestamp = now

      return status
    }

    return null
  } catch (error) {
    console.error('Onboarding status check failed:', error)
    return null
  }
}

/**
 * Determines if user should be redirected to onboarding
 * @returns true if user should go to onboarding, false otherwise
 */
export async function shouldRedirectToOnboarding(): Promise<boolean> {
  const status = await checkOnboardingStatus()
  // If check fails, default to false (allow access)
  return status ? !status.completed : false
}

/**
 * Determines if user should be redirected away from onboarding (already completed)
 * @returns true if user should go to dashboard, false otherwise
 */
export async function shouldRedirectFromOnboarding(): Promise<boolean> {
  const status = await checkOnboardingStatus()
  // If check fails, default to false (stay on onboarding)
  return status ? status.completed : false
}
