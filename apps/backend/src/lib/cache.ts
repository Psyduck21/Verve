import { redis } from './redis'
import { logger } from './logger'

interface CacheOptions {
  ttl?: number
  tags?: string[]
}

interface CacheEntry<T> {
  value: T
  expires: number
}

export class CacheService {
  private static localCache = new Map<string, CacheEntry<any>>()
  private static tagIndex = new Map<string, Set<string>>()
  private static cleanupInterval: NodeJS.Timeout | null = null
  private static readonly MAX_LOCAL_CACHE_SIZE = 1000 // Limit to 1000 entries to prevent OOM
  private static accessOrder: string[] = [] // Track access order for LRU eviction

  /**
   * Get value from cache (L1 local cache first, then L2 Redis)
   */
  static async get<T>(key: string): Promise<T | null> {
    // Check local cache (L1) first
    const local = this.localCache.get(key)
    if (local && local.expires > Date.now()) {
      // Update access order for LRU
      this.updateAccessOrder(key)
      return local.value as T
    }

    // Clean up expired local cache entry
    if (local) {
      this.localCache.delete(key)
      this.removeFromAccessOrder(key)
    }

    // Check Redis (L2)
    try {
      const cached = await redis.get(key) as string | null
      if (cached && cached !== '') {
        const parsed = JSON.parse(cached) as T
        // Populate local cache with shorter TTL
        const localTTL = Math.min(60000, 60 * 1000) // Max 1 minute local
        this.localCache.set(key, {
          value: parsed,
          expires: Date.now() + localTTL
        })
        this.updateAccessOrder(key)
        return parsed
      }
    } catch (error: any) {
      // Redis error, continue
      logger.error('Cache get error', error as Error)
    }

    return null
  }

  /**
   * Update access order for LRU tracking
   */
  private static updateAccessOrder(key: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    // Add to end (most recently used)
    this.accessOrder.push(key)
  }

  /**
   * Remove key from access order
   */
  private static removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  /**
   * Evict least recently used entry if size limit reached
   */
  private static evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift()!
      this.localCache.delete(lruKey)
    }
  }
  
  /**
   * Set value in cache (both L1 and L2)
   */
  static async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const { ttl = 300, tags = [] } = options

    // Evict LRU entry if size limit reached
    if (this.localCache.size >= this.MAX_LOCAL_CACHE_SIZE) {
      this.evictLRU()
    }

    // Set local cache (L1) with shorter TTL
    const localTTL = Math.min(ttl * 1000, 60000) // Max 1 minute local
    this.localCache.set(key, {
      value,
      expires: Date.now() + localTTL
    })
    this.updateAccessOrder(key)

    // Set Redis cache (L2)
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl)

      // Update tag index for selective invalidation
      for (const tag of tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set())
        }
        this.tagIndex.get(tag)!.add(key)
      }
    } catch (error: any) {
      logger.error('Cache set error', error as Error)
    }
  }
  
  /**
   * Delete a specific key from cache
   */
  static async del(key: string): Promise<void> {
    // Remove from local cache
    this.localCache.delete(key)
    this.removeFromAccessOrder(key)

    // Remove from Redis
    try {
      await redis.del(key)
    } catch (error: any) {
      logger.error('Cache delete error', error as Error)
    }

    // Remove from tag index
    for (const [tag, keys] of this.tagIndex.entries()) {
      if (keys.has(key)) {
        keys.delete(key)
        if (keys.size === 0) {
          this.tagIndex.delete(tag)
        }
      }
    }
  }
  
  /**
   * Invalidate all cache entries with a specific tag
   */
  static async invalidateTag(tag: string): Promise<void> {
    const keys = this.tagIndex.get(tag)
    if (!keys) return

    // Clear from local cache
    for (const key of keys) {
      this.localCache.delete(key)
      this.removeFromAccessOrder(key)
    }

    // Clear from Redis
    try {
      await Promise.all([...keys].map(key => redis.del(key)))
    } catch (error: any) {
      logger.error('Cache tag invalidation error', error as Error)
    }

    // Remove tag from index
    this.tagIndex.delete(tag)
  }
  
  /**
   * Invalidate cache keys matching a pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    // Remove from local cache
    for (const key of this.localCache.keys()) {
      if (key.match(pattern)) {
        this.localCache.delete(key)
      }
    }
    
    // Remove from Redis (requires SCAN operation for large datasets)
    try {
      // For simplicity, we'll use a basic approach
      // In production, you might want to use Redis SCAN for better performance
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error: any) {
      logger.error('Cache pattern invalidation error', error as Error)
    }
  }
  
  /**
   * Clear all local cache entries
   */
  static clearLocal(): void {
    this.localCache.clear()
    this.accessOrder = []
  }
  
  /**
   * Get cache statistics
   */
  static getStats() {
    return {
      localCacheSize: this.localCache.size,
      tagCount: this.tagIndex.size,
      memoryUsage: process.memoryUsage()
    }
  }
  
  /**
   * Start periodic cleanup of expired local cache entries
   */
  static startCleanup(): void {
    if (this.cleanupInterval) return
    
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      let cleaned = 0
      
      for (const [key, entry] of this.localCache.entries()) {
        if (entry.expires <= now) {
          this.localCache.delete(key)
          cleaned++
        }
      }
      
      if (cleaned > 0) {
        logger.info(`Cache cleanup: removed ${cleaned} expired entries`)
      }
    }, 60000) // Clean every minute
  }
  
  /**
   * Stop periodic cleanup
   */
  static stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// Start cleanup on import
CacheService.startCleanup()