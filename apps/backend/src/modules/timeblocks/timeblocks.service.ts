import { db } from '../../lib/db'
import { timeBlocks } from '@verve/db'
import { eq, and, gte, lte, desc } from '@verve/db'
import { z } from 'zod'

export const CreateTimeBlockSchema = z.object({
  task_id: z.string().uuid().optional(),
  start_time: z.string().datetime({ offset: true }),
  end_time: z.string().datetime({ offset: true }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  label: z.string().max(100).optional(),
})

export const UpdateTimeBlockSchema = z.object({
  task_id: z.string().uuid().optional(),
  start_time: z.string().datetime({ offset: true }).optional(),
  end_time: z.string().datetime({ offset: true }).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  label: z.string().max(100).optional(),
})

export type CreateTimeBlockInput = z.infer<typeof CreateTimeBlockSchema>
export type UpdateTimeBlockInput = z.infer<typeof UpdateTimeBlockSchema>

export class TimeBlocksService {
  /**
   * Create a new time block
   */
  static async createTimeBlock(userId: string, input: CreateTimeBlockInput) {
    const startTime = new Date(input.start_time)
    const endTime = new Date(input.end_time)

    // Validate time range
    if (endTime <= startTime) {
      throw new Error('End time must be after start time')
    }

    // Check for conflicts
    const conflicts = await this.detectConflicts(userId, startTime, endTime)
    if (conflicts.length > 0) {
      throw new Error(`Time block conflicts with ${conflicts.length} existing block(s)`)
    }

    const [timeBlock] = await db
      .insert(timeBlocks)
      .values({
        user_id: userId,
        task_id: input.task_id,
        start_time: startTime,
        end_time: endTime,
        color: input.color || '#7C3AED',
        label: input.label,
      })
      .returning()

    return timeBlock
  }

  /**
   * List time blocks for a user within a date range
   */
  static async listTimeBlocks(
    userId: string,
    options: {
      start_date?: string
      end_date?: string
      task_id?: string
    } = {}
  ) {
    const conditions = [eq(timeBlocks.user_id, userId)]

    if (options.start_date) {
      conditions.push(gte(timeBlocks.start_time, new Date(options.start_date)))
    }

    if (options.end_date) {
      conditions.push(lte(timeBlocks.end_time, new Date(options.end_date)))
    }

    if (options.task_id) {
      conditions.push(eq(timeBlocks.task_id, options.task_id))
    }

    const blocks = await db
      .select()
      .from(timeBlocks)
      .where(and(...conditions))
      .orderBy(timeBlocks.start_time)

    return blocks
  }

  /**
   * Get a specific time block by ID
   */
  static async getTimeBlock(id: string, userId: string) {
    const [block] = await db
      .select()
      .from(timeBlocks)
      .where(and(eq(timeBlocks.id, id), eq(timeBlocks.user_id, userId)))

    if (!block) {
      throw new Error('Time block not found')
    }

    return block
  }

  /**
   * Update a time block
   */
  static async updateTimeBlock(id: string, userId: string, input: UpdateTimeBlockInput) {
    const existing = await this.getTimeBlock(id, userId)

    const startTime = input.start_time ? new Date(input.start_time) : existing.start_time
    const endTime = input.end_time ? new Date(input.end_time) : existing.end_time

    // Validate time range after applying any updated values
    if (endTime <= startTime) {
      throw new Error('End time must be after start time')
    }

    const conflicts = await this.detectConflicts(userId, startTime, endTime, id)
    if (conflicts.length > 0) {
      throw new Error(`Time block conflicts with ${conflicts.length} existing block(s)`)
    }

    const [updated] = await db
      .update(timeBlocks)
      .set({
        task_id: input.task_id ?? existing.task_id,
        start_time: startTime,
        end_time: endTime,
        color: input.color ?? existing.color,
        label: input.label ?? existing.label,
        updated_at: new Date(),
      })
      .where(and(eq(timeBlocks.id, id), eq(timeBlocks.user_id, userId)))
      .returning()

    return updated
  }

  /**
   * Delete a time block
   */
  static async deleteTimeBlock(id: string, userId: string) {
    await this.getTimeBlock(id, userId)

    await db
      .delete(timeBlocks)
      .where(and(eq(timeBlocks.id, id), eq(timeBlocks.user_id, userId)))
  }

  /**
   * Convert a time block to a task
   */
  static async convertToTask(id: string, userId: string) {
    const block = await this.getTimeBlock(id, userId)

    // Import tasks schema dynamically to avoid circular dependency
    const { tasks } = await import('@verve/db')
    const { eq: eqTask } = await import('@verve/db')

    const durationMinutes = Math.floor(
      (block.end_time.getTime() - block.start_time.getTime()) / 60000
    )

    const [task] = await db
      .insert(tasks)
      .values({
        user_id: userId,
        routine_id: undefined,
        title: block.label || 'Time Block Task',
        description: `Created from time block (${block.start_time.toISOString()} - ${block.end_time.toISOString()})`,
        priority: 'medium',
        status: 'not_started',
        category: undefined,
        scheduled_at: block.start_time,
        estimated_duration_minutes: durationMinutes,
      })
      .returning()

    // Link the time block to the task
    const [updatedBlock] = await db
      .update(timeBlocks)
      .set({ task_id: task.id })
      .where(eq(timeBlocks.id, id))
      .returning()

    return { task, deletedBlock: updatedBlock }
  }

  /**
   * Detect time block conflicts
   */
  static async detectConflicts(
    userId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string
  ) {
    const conditions = [
      eq(timeBlocks.user_id, userId),
      // Overlapping condition: (start < new_end) AND (end > new_start)
    ]

    const conflicts = await db
      .select()
      .from(timeBlocks)
      .where(and(...conditions))

    // Filter for actual overlaps in JavaScript and exclude the current block if needed.
    return conflicts.filter(
      (block) =>
        block.id !== excludeId &&
        block.start_time < endTime &&
        block.end_time > startTime
    )
  }

  /**
   * Get time blocks for a specific date
   */
  static async getTimeBlocksForDate(userId: string, date: Date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return this.listTimeBlocks(userId, {
      start_date: startOfDay.toISOString(),
      end_date: endOfDay.toISOString(),
    })
  }
}
