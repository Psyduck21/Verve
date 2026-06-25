import posthog from 'posthog-js'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

export const initPostHog = () => {
  if (typeof window !== 'undefined' && POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug()
      },
      capture_pageview: false // We handle this manually in Next.js
    })
  }
}

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && POSTHOG_KEY) {
    posthog.capture(eventName, properties)
  }
}

export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (typeof window !== 'undefined' && POSTHOG_KEY) {
    posthog.identify(userId, traits)
  }
}

export const isFeatureEnabled = (featureFlag: string): boolean => {
  if (typeof window !== 'undefined' && POSTHOG_KEY) {
    return !!posthog.isFeatureEnabled(featureFlag)
  }
  return false
}

export default posthog
