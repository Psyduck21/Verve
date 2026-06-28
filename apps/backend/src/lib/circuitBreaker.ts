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

export const openRouterCircuitBreaker = {
  execute: async <T>(fn: () => Promise<T>): Promise<T> => {
    const breaker = createCircuitBreaker(fn)
    return breaker.fire() as Promise<T>
  }
}
