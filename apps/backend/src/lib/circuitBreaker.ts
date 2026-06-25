import { redis, RedisKeys } from './redis'

interface CircuitBreakerOptions {
  failureThreshold?: number
  recoveryTimeout?: number // seconds
  monitoringPeriod?: number // seconds
}

interface CircuitBreakerState {
  isOpen: boolean
  failureCount: number
  lastFailureTime?: number
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  recoveryTimeout: 60, // 1 minute
  monitoringPeriod: 300, // 5 minutes
}

export class CircuitBreaker {
  private key: string
  private options: CircuitBreakerOptions

  constructor(key: string, options: CircuitBreakerOptions = {}) {
    this.key = key
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  async getState(): Promise<CircuitBreakerState> {
    const data = await redis.hgetall(this.key)
    
    if (!data || Object.keys(data).length === 0) {
      return { isOpen: false, failureCount: 0 }
    }

    return {
      isOpen: data.isOpen === 'true',
      failureCount: parseInt(data.failureCount || '0', 10),
      lastFailureTime: data.lastFailureTime ? parseInt(data.lastFailureTime, 10) : undefined,
    }
  }

  async isOpen(): Promise<boolean> {
    const state = await this.getState()
    
    // Check if circuit should be reset (recovery timeout passed)
    if (state.isOpen && state.lastFailureTime) {
      const now = Date.now()
      const timeSinceFailure = (now - state.lastFailureTime) / 1000 // seconds
      
      if (timeSinceFailure > this.options.recoveryTimeout!) {
        // Attempt to close circuit (half-open state)
        await this.reset()
        return false
      }
    }

    return state.isOpen
  }

  async recordSuccess(): Promise<void> {
    await redis.hset(this.key, {
      isOpen: 'false',
      failureCount: '0',
      lastFailureTime: '0',
    })
    await redis.expire(this.key, this.options.monitoringPeriod!)
  }

  async recordFailure(): Promise<void> {
    const state = await this.getState()
    const newFailureCount = state.failureCount + 1
    
    await redis.hset(this.key, {
      isOpen: newFailureCount >= this.options.failureThreshold! ? 'true' : 'false',
      failureCount: newFailureCount.toString(),
      lastFailureTime: Date.now().toString(),
    })
    await redis.expire(this.key, this.options.monitoringPeriod!)
  }

  async reset(): Promise<void> {
    await redis.hset(this.key, {
      isOpen: 'false',
      failureCount: '0',
      lastFailureTime: '0',
    })
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (await this.isOpen()) {
      throw new Error('Circuit breaker is open. Service is temporarily unavailable.')
    }

    try {
      const result = await fn()
      await this.recordSuccess()
      return result
    } catch (error) {
      await this.recordFailure()
      throw error
    }
  }
}

// Singleton instances
const circuitBreakers = new Map<string, CircuitBreaker>()

export function getCircuitBreaker(key: string, options?: CircuitBreakerOptions): CircuitBreaker {
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, new CircuitBreaker(key, options))
  }
  return circuitBreakers.get(key)!
}

// Pre-configured circuit breakers
export const openRouterCircuitBreaker = getCircuitBreaker(
  RedisKeys.circuitBreaker(),
  {
    failureThreshold: 5,
    recoveryTimeout: 60, // 1 minute
    monitoringPeriod: 300, // 5 minutes
  }
)
