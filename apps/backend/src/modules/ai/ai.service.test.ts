import { describe, expect, test, vi, beforeEach } from 'vitest'
import { AiService } from './ai.service'
import { redis } from '../../lib/redis'

vi.mock('../../lib/redis', () => ({
  redis: {
    incr: vi.fn(),
    expire: vi.fn()
  },
  RedisKeys: {
    aiDailyBudget: vi.fn((userId) => `rl:ai:user:${userId}:daily`)
  }
}))

describe('AiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('checkBudgetAndIncrement allows under budget', async () => {
    const mockIncr = redis.incr as any
    const mockExpire = redis.expire as any
    mockIncr.mockResolvedValueOnce(5)

    const allowed = await AiService.checkBudgetAndIncrement('user-1')
    expect(allowed).toBe(true)
    expect(mockIncr).toHaveBeenCalled()
  })

  test('checkBudgetAndIncrement denies over budget', async () => {
    const mockIncr = redis.incr as any
    mockIncr.mockResolvedValueOnce(55)

    const allowed = await AiService.checkBudgetAndIncrement('user-1')
    expect(allowed).toBe(false)
  })
})
