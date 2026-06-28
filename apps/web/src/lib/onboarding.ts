import { createClient } from '@/utils/supabase/server'

export interface OnboardingStatus {
  completed: boolean
  step?: number
}

/**
 * Centralized function to check onboarding status from the backend
 * @returns Onboarding status or null if check fails
 */
export async function checkOnboardingStatus(): Promise<OnboardingStatus | null> {
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
      next: { revalidate: 300 }, // Cache for 5 minutes on server side
    })

    if (response.ok) {
      const data = await response.json()
      return {
        completed: data.data?.completed || false,
        step: data.data?.step,
      }
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
