import { redis, RedisKeys } from './redis'

export interface DLQMessage {
  id: string
  operation: string
  payload: any
  error: string
  timestamp: string
  retryCount: number
  maxRetries: number
  metadata?: {
    userId?: string
    taskId?: string
    [key: string]: any
  }
}

export class DeadLetterQueue {
  private queueName: string
  private maxRetries: number
  private retryDelay: number // seconds

  constructor(queueName: string, options: { maxRetries?: number; retryDelay?: number } = {}) {
    this.queueName = queueName
    this.maxRetries = options.maxRetries || 3
    this.retryDelay = options.retryDelay || 300 // 5 minutes default
  }

  /**
   * Add a failed operation to the dead letter queue
   */
  async add(message: Omit<DLQMessage, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>): Promise<void> {
    const dlqMessage: DLQMessage = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries: this.maxRetries,
      ...message,
    }

    const key = RedisKeys.syncLock(`dlq:${this.queueName}:${dlqMessage.id}`)
    await redis.hset(key, dlqMessage as any)
    await redis.expire(key, 86400) // 24 hours TTL
  }

  /**
   * Get all messages in the dead letter queue
   */
  async getAll(): Promise<DLQMessage[]> {
    const pattern = RedisKeys.syncLock(`dlq:${this.queueName}:*`)
    const keys = await redis.keys(pattern)
    
    if (keys.length === 0) return []

    const messages = await Promise.all(
      keys.map(async (key) => {
        const data = await redis.hgetall(key)
        return data as unknown as DLQMessage
      })
    )

    return messages.filter(m => m && m.retryCount < m.maxRetries)
  }

  /**
   * Get a specific message by ID
   */
  async get(id: string): Promise<DLQMessage | null> {
    const key = RedisKeys.syncLock(`dlq:${this.queueName}:${id}`)
    const data = await redis.hgetall(key)
    
    if (!data || Object.keys(data).length === 0) return null
    
    return data as unknown as DLQMessage
  }

  /**
   * Retry a failed operation
   */
  async retry(id: string, retryFn: (payload: any) => Promise<void>): Promise<boolean> {
    const message = await this.get(id)
    
    if (!message) {
      throw new Error('Message not found in dead letter queue')
    }

    if (message.retryCount >= message.maxRetries) {
      throw new Error('Max retries exceeded for this message')
    }

    try {
      await retryFn(message.payload)
      
      // Success - remove from DLQ
      await this.remove(id)
      return true
    } catch (error) {
      // Failure - increment retry count
      message.retryCount++
      message.timestamp = new Date().toISOString()
      message.error = (error as Error).message
      
      const key = RedisKeys.syncLock(`dlq:${this.queueName}:${id}`)
      await redis.hset(key, message as any)
      
      // If max retries reached, mark for manual review
      if (message.retryCount >= message.maxRetries) {
        await this.markForReview(id)
      }
      
      return false
    }
  }

  /**
   * Remove a message from the dead letter queue
   */
  async remove(id: string): Promise<void> {
    const key = RedisKeys.syncLock(`dlq:${this.queueName}:${id}`)
    await redis.del(key)
  }

  /**
   * Mark a message for manual review (max retries exceeded)
   */
  async markForReview(id: string): Promise<void> {
    const message = await this.get(id)
    if (!message) return

    // Add to review queue
    const reviewKey = RedisKeys.syncLock(`dlq:review:${this.queueName}:${id}`)
    await redis.hset(reviewKey, message as any)
    await redis.expire(reviewKey, 604800) // 7 days TTL for review items
  }

  /**
   * Get messages marked for review
   */
  async getReviewQueue(): Promise<DLQMessage[]> {
    const pattern = RedisKeys.syncLock(`dlq:review:${this.queueName}:*`)
    const keys = await redis.keys(pattern)
    
    if (keys.length === 0) return []

    const messages = await Promise.all(
      keys.map(async (key) => {
        const data = await redis.hgetall(key)
        return data as unknown as DLQMessage
      })
    )

    return messages.filter(m => m !== null)
  }

  /**
   * Process retryable messages (cron job)
   */
  async processRetryable(retryFn: (payload: any) => Promise<void>): Promise<{ success: number; failed: number }> {
    const messages = await this.getAll()
    let success = 0
    let failed = 0

    for (const message of messages) {
      try {
        const result = await this.retry(message.id, retryFn)
        if (result) success++
        else failed++
      } catch (error) {
        failed++
      }
    }

    return { success, failed }
  }
}

// Pre-configured DLQ instances
export const notificationDLQ = new DeadLetterQueue('notifications', {
  maxRetries: 3,
  retryDelay: 300, // 5 minutes
})

export const syncDLQ = new DeadLetterQueue('sync', {
  maxRetries: 5,
  retryDelay: 600, // 10 minutes
})

export const aiDLQ = new DeadLetterQueue('ai', {
  maxRetries: 3,
  retryDelay: 180, // 3 minutes
})
