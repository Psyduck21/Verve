import { describe, expect, test } from 'vitest'
import { TaskListQuerySchema } from './tasks.routes.validation'

describe('TaskListQuerySchema', () => {
  test('parses valid range filters and cursor', () => {
    const result = TaskListQuerySchema.safeParse({
      cursor: '2025-01-01T12:00:00.000Z',
      limit: '50',
      start_date: '2025-01-01T00:00:00.000Z',
      end_date: '2025-01-07T23:59:59.000Z',
    })

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.cursor).toBe('2025-01-01T12:00:00.000Z')
    expect(result.data.limit).toBe(50)

    const startDate = result.data.start_date
    const endDate = result.data.end_date
    expect(startDate).toBeDefined()
    expect(endDate).toBeDefined()
    expect(startDate?.toISOString()).toBe('2025-01-01T00:00:00.000Z')
    expect(endDate?.toISOString()).toBe('2025-01-07T23:59:59.000Z')
  })

  test('fails for invalid start_date or end_date values', () => {
    const result = TaskListQuerySchema.safeParse({
      start_date: 'not-a-date',
      end_date: '2025-01-07',
    })

    expect(result.success).toBe(false)
  })
})
