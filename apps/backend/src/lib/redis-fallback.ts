import Redis from 'ioredis'
import { FastifyBaseLogger } from 'fastify'

// Circuit breaker states
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

interface RedisInstance {
  name: string
  client: Redis
  isPrimary: boolean
  healthy: boolean
  circuitState: CircuitState
  failureCount: number
  lastFailureTime?: Date
  lastHealthCheck?: Date
}

interface FallbackConfig {
  primary: {
    url: string
    name: string
  }
  fallback: {
    url: string
    name: string
  }
  healthCheckInterval: number
  circuitBreakerThreshold: number
  circuitBreakerTimeout: number
  autoFailover: boolean
}

interface RedisStats {
  primaryRequests: number
  fallbackRequests: number
  failoverCount: number
  lastFailoverTime?: Date
  circuitBreakerTrips: number
}

class RedisFallbackClient {
  private primary: RedisInstance
  private fallback: RedisInstance
  private current: RedisInstance
  private config: FallbackConfig
  private logger: FastifyBaseLogger
  private healthCheckTimer?: NodeJS.Timeout
  private stats: RedisStats = {
    primaryRequests: 0,
    fallbackRequests: 0,
    failoverCount: 0,
    circuitBreakerTrips: 0,
  }

  constructor(config: FallbackConfig, logger: FastifyBaseLogger) {
    this.config = config
    this.logger = logger

    // Initialize primary Redis instance
    this.primary = {
      name: config.primary.name,
      client: new Redis(config.primary.url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 15000, // Increased for SSL connections
        commandTimeout: 15000, // Increased for SSL connections
        tls: {}, // Enable TLS for rediss:// URLs
        keepAlive: 30000, // Keep connections alive
      }),
      isPrimary: true,
      healthy: true,
      circuitState: 'CLOSED',
      failureCount: 0,
    }

    // Initialize fallback Redis instance
    this.fallback = {
      name: config.fallback.name,
      client: new Redis(config.fallback.url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 15000, // Increased for SSL connections
        commandTimeout: 15000, // Increased for SSL connections
        tls: {}, // Enable TLS for rediss:// URLs
        keepAlive: 30000, // Keep connections alive
      }),
      isPrimary: false,
      healthy: true,
      circuitState: 'CLOSED',
      failureCount: 0,
    }

    // Start with primary
    this.current = this.primary

    // Setup error handlers
    this.setupErrorHandlers(this.primary)
    this.setupErrorHandlers(this.fallback)

    // Start health checks
    this.startHealthChecks()

    // Connect to both instances
    this.connectInstances()
  }

  private setupErrorHandlers(instance: RedisInstance): void {
    instance.client.on('error', (err) => {
      this.handleInstanceError(instance, err)
    })

    instance.client.on('close', () => {
      this.logger.warn({ instance: instance.name }, 'Redis connection closed')
      instance.healthy = false
    })

    instance.client.on('connect', () => {
      this.logger.info({ instance: instance.name }, 'Redis connection established')
      instance.healthy = true
      instance.failureCount = 0
      instance.circuitState = 'CLOSED'
    })
  }

  private async connectInstances(): Promise<void> {
    try {
      await this.primary.client.connect()
      await this.fallback.client.connect()
      this.logger.info('Both Redis instances connected successfully')
    } catch (error) {
      this.logger.error({ error }, 'Failed to connect to Redis instances')
    }
  }

  private handleInstanceError(instance: RedisInstance, error: any): void {
    instance.failureCount++
    instance.lastFailureTime = new Date()
    instance.healthy = false

    // Check if it's an Upstash request limit error
    const isRequestLimitError = error.message?.includes('max requests limit exceeded')

    this.logger.error({
      instance: instance.name,
      error: error.message,
      failureCount: instance.failureCount,
      isRequestLimitError,
    }, 'Redis instance error')

    // Trigger circuit breaker if threshold reached
    if (instance.failureCount >= this.config.circuitBreakerThreshold) {
      this.tripCircuitBreaker(instance)
    }

    // Auto failover if enabled and this is the current instance
    if (this.config.autoFailover && this.current === instance) {
      if (isRequestLimitError || instance.circuitState === 'OPEN') {
        this.failover()
      }
    }
  }

  private tripCircuitBreaker(instance: RedisInstance): void {
    if (instance.circuitState !== 'OPEN') {
      instance.circuitState = 'OPEN'
      this.stats.circuitBreakerTrips++
      this.logger.warn(
        { instance: instance.name, failureCount: instance.failureCount },
        'Circuit breaker tripped'
      )

      // Reset circuit breaker after timeout
      setTimeout(() => {
        instance.circuitState = 'HALF_OPEN'
        this.logger.info({ instance: instance.name }, 'Circuit breaker now half-open')
      }, this.config.circuitBreakerTimeout)
    }
  }

  private async failover(): Promise<void> {
    const target = this.current.isPrimary ? this.fallback : this.primary

    if (this.current === target) {
      this.logger.warn('Already using target instance, skipping failover')
      return
    }

    this.logger.warn(
      {
        from: this.current.name,
        to: target.name,
        reason: this.current.circuitState === 'OPEN' ? 'circuit breaker open' : 'connection failure',
      },
      'Initiating Redis failover'
    )

    this.current = target
    this.stats.failoverCount++
    this.stats.lastFailoverTime = new Date()

    if (target.isPrimary) {
      this.stats.primaryRequests++
    } else {
      this.stats.fallbackRequests++
    }

    this.logger.info({ currentInstance: this.current.name }, 'Failover complete')
  }

  private async performHealthCheck(instance: RedisInstance): Promise<boolean> {
    try {
      const result = await instance.client.ping()
      instance.lastHealthCheck = new Date()
      instance.healthy = true

      // If circuit breaker is half-open, close it on success
      if (instance.circuitState === 'HALF_OPEN') {
        instance.circuitState = 'CLOSED'
        instance.failureCount = 0
        this.logger.info({ instance: instance.name }, 'Circuit breaker closed after successful health check')
      }

      return result === 'PONG'
    } catch (error) {
      instance.healthy = false
      instance.failureCount++
      this.logger.error({
        instance: instance.name,
        error: error instanceof Error ? error.message : String(error),
      }, 'Health check failed')
      return false
    }
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      // Check primary
      const primaryHealthy = await this.performHealthCheck(this.primary)
      
      // Check fallback
      const fallbackHealthy = await this.performHealthCheck(this.fallback)

      // Auto failover if primary is unhealthy and fallback is healthy
      if (
        this.config.autoFailover &&
        this.current === this.primary &&
        !primaryHealthy &&
        fallbackHealthy
      ) {
        this.logger.warn('Primary unhealthy, initiating failover to fallback')
        await this.failover()
      }

      // Auto recover if primary is healthy and we're on fallback
      if (
        this.config.autoFailover &&
        this.current === this.fallback &&
        primaryHealthy &&
        this.primary.circuitState === 'CLOSED'
      ) {
        this.logger.info('Primary recovered, switching back')
        this.current = this.primary
      }
    }, this.config.healthCheckInterval)
  }

  // Proxy Redis methods to current instance
  private async executeCommand<T>(command: string, ...args: any[]): Promise<T> {
    const instance = this.current

    // Track usage
    if (instance.isPrimary) {
      this.stats.primaryRequests++
    } else {
      this.stats.fallbackRequests++
    }

    // Check circuit breaker
    if (instance.circuitState === 'OPEN') {
      if (this.config.autoFailover) {
        await this.failover()
      } else {
        throw new Error(`Circuit breaker open for ${instance.name}`)
      }
    }

    try {
      const result = await (instance.client as any)[command](...args)
      
      // Reset failure count on success
      if (instance.failureCount > 0) {
        instance.failureCount = Math.max(0, instance.failureCount - 1)
      }

      return result
    } catch (error) {
      this.handleInstanceError(instance, error)
      throw error
    }
  }

  // Redis proxy methods
  get(key: string): Promise<string | null> {
    return this.executeCommand('get', key)
  }

  set(key: string, value: string): Promise<'OK'> {
    return this.executeCommand('set', key, value)
  }

  setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.executeCommand('setex', key, seconds, value)
  }

  del(...keys: string[]): Promise<number> {
    return this.executeCommand('del', ...keys)
  }

  exists(...keys: string[]): Promise<number> {
    return this.executeCommand('exists', ...keys)
  }

  expire(key: string, seconds: number): Promise<number> {
    return this.executeCommand('expire', key, seconds)
  }

  ttl(key: string): Promise<number> {
    return this.executeCommand('ttl', key)
  }

  incr(key: string): Promise<number> {
    return this.executeCommand('incr', key)
  }

  decr(key: string): Promise<number> {
    return this.executeCommand('decr', key)
  }

  hget(key: string, field: string): Promise<string | null> {
    return this.executeCommand('hget', key, field)
  }

  hset(key: string, field: string, value: string): Promise<number> {
    return this.executeCommand('hset', key, field, value)
  }

  hgetall(key: string): Promise<Record<string, string>> {
    return this.executeCommand('hgetall', key)
  }

  hdel(key: string, ...fields: string[]): Promise<number> {
    return this.executeCommand('hdel', key, ...fields)
  }

  lpush(key: string, ...values: string[]): Promise<number> {
    return this.executeCommand('lpush', key, ...values)
  }

  rpush(key: string, ...values: string[]): Promise<number> {
    return this.executeCommand('rpush', key, ...values)
  }

  lpop(key: string): Promise<string | null> {
    return this.executeCommand('lpop', key)
  }

  rpop(key: string): Promise<string | null> {
    return this.executeCommand('rpop', key)
  }

  lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.executeCommand('lrange', key, start, stop)
  }

  sadd(key: string, ...members: string[]): Promise<number> {
    return this.executeCommand('sadd', key, ...members)
  }

  srem(key: string, ...members: string[]): Promise<number> {
    return this.executeCommand('srem', key, ...members)
  }

  smembers(key: string): Promise<string[]> {
    return this.executeCommand('smembers', key)
  }

  sismember(key: string, member: string): Promise<number> {
    return this.executeCommand('sismember', key, member)
  }

  zadd(key: string, score: number, member: string): Promise<number> {
    return this.executeCommand('zadd', key, score, member)
  }

  zrem(key: string, ...members: string[]): Promise<number> {
    return this.executeCommand('zrem', key, ...members)
  }

  zrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.executeCommand('zrange', key, start, stop)
  }

  zscore(key: string, member: string): Promise<string | null> {
    return this.executeCommand('zscore', key, member)
  }

  // Get the underlying Redis client for BullMQ compatibility
  getClient(): Redis {
    return this.current.client
  }

  // Get current instance info
  getCurrentInstance(): RedisInstance {
    return this.current
  }

  // Get stats
  getStats(): RedisStats {
    return { ...this.stats }
  }

  // Manual failover
  async manualFailover(): Promise<void> {
    await this.failover()
  }

  // Force use primary
  forcePrimary(): void {
    if (this.primary.healthy && this.primary.circuitState !== 'OPEN') {
      this.current = this.primary
      this.logger.info('Forced switch to primary Redis instance')
    } else {
      this.logger.warn('Cannot force primary - unhealthy or circuit breaker open')
    }
  }

  // Force use fallback
  forceFallback(): void {
    if (this.fallback.healthy && this.fallback.circuitState !== 'OPEN') {
      this.current = this.fallback
      this.logger.info('Forced switch to fallback Redis instance')
    } else {
      this.logger.warn('Cannot force fallback - unhealthy or circuit breaker open')
    }
  }

  // Cleanup
  async quit(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }

    try {
      await this.primary.client.quit()
      await this.fallback.client.quit()
      this.logger.info('Redis fallback client shutdown complete')
    } catch (error) {
      this.logger.error({ error }, 'Error during Redis fallback client shutdown')
    }
  }
}

export { RedisFallbackClient, FallbackConfig, RedisStats, RedisInstance }
