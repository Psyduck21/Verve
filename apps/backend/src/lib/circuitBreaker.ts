import Opossum from 'opossum'

export function createCircuitBreaker<T extends (...args: any[]) => any>(
  fn: T,
  options?: Opossum.Options
) {
  const breaker = new Opossum(fn, {
    timeout: 15000, // 15 seconds
    errorThresholdPercentage: 50, // open after 50% failures
    resetTimeout: 30000, // try again after 30 seconds
    ...options
  })

  breaker.fallback(() => {
    throw new Error('Circuit breaker is open. Service is temporarily unavailable.')
  })

  return breaker
}

// Create a single shared circuit breaker instance to prevent memory leaks
const sharedBreaker = createCircuitBreaker(
  async () => { /* placeholder function */ },
  {
    timeout: 15000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  }
)

export const openRouterCircuitBreaker = {
  execute: async <T>(fn: () => Promise<T>): Promise<T> => {
    // Use the shared breaker to prevent creating new instances
    // Note: This is a simplified approach. For production, consider using
    // a circuit breaker per operation type with proper function wrapping
    return sharedBreaker.fire(fn) as Promise<T>
  }
}
