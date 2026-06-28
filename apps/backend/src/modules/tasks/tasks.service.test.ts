import { describe, expect, test, vi, beforeEach } from 'vitest'
import { TasksService } from './tasks.service'
import { db } from '../../lib/db'

// Mock the db and redis modules
vi.mock('../../lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn((cb) => cb({
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'task-123', scheduled_at: new Date() }])
    }))
  }
}))

vi.mock('../../lib/redis', () => ({
  redis: {
    del: vi.fn()
  },
  RedisKeys: {
    dashboardSummary: vi.fn()
  }
}))

describe('TasksService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('createTask requires a routine if it exists', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockFrom = vi.fn().mockReturnThis()
    const mockWhere = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockResolvedValue([])

    db.select = mockSelect as any
    mockSelect.mockReturnValue({
      from: mockFrom
    })
    mockFrom.mockReturnValue({
      where: mockWhere
    })
    mockWhere.mockReturnValue({
      limit: mockLimit
    })

    // Mock an empty routine check response to trigger routine creation
    mockLimit.mockResolvedValueOnce([])
    
    const mockInsert = vi.fn().mockReturnThis()
    const mockValues = vi.fn().mockReturnThis()
    const mockReturning = vi.fn().mockResolvedValue([{ id: 'new-routine-1' }])
    
    db.insert = mockInsert as any
    mockInsert.mockReturnValue({ values: mockValues })
    mockValues.mockReturnValue({ returning: mockReturning })

    const taskData = {
      title: 'Test Task',
      priority: 'high'
    }

    const result = await TasksService.createTask('user-1', taskData)
    expect(result).toBeDefined()
    expect(result.id).toBe('task-123')
  })
})
