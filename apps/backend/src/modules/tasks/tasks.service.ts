import { db } from '../../lib/db'
import { tasks, routines, tombstones, taskRecurrences, taskExternalMetadata } from '@verve/db'
import { eq, and, desc } from '@verve/db'
import { z } from 'zod'
import { redis, RedisKeys } from '../../lib/redis'

export const CreateSubtaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'missed', 'cancelled']).optional(),
  estimated_duration_minutes: z.number().min(5).max(480).optional(),
  scheduled_at: z.string().datetime({ offset: true }).nullable().optional(),
})

export type CreateSubtaskInput = z.infer<typeof CreateSubtaskSchema>

export class TasksService {
  private static async invalidateDashboardSummaries(userId: string, dates: Array<string | Date | null | undefined>) {
    const uniqueKeys = new Set(
      dates
        .filter((date): date is string | Date => Boolean(date))
        .map((date) => RedisKeys.dashboardSummary(userId, date))
    )

    await Promise.all([...uniqueKeys].map((key) => redis.del(key)))
  }

  static async createTask(userId: string, taskData: any) {
    let routineId = taskData.routine_id
    if (!routineId) {
      const userRoutines = await db
        .select({ id: routines.id })
        .from(routines)
        .where(eq(routines.user_id, userId))
        .limit(1)
      if (userRoutines.length) {
        routineId = userRoutines[0].id
      } else {
        const [newRoutine] = await db
          .insert(routines)
          .values({ user_id: userId, title: 'Default Routine' })
          .returning({ id: routines.id })
        routineId = newRoutine.id
      }
    } else {
      const routine = await db
        .select({ id: routines.id })
        .from(routines)
        .where(and(eq(routines.id, routineId), eq(routines.user_id, userId)))
      if (!routine.length) {
        throw new Error('Invalid routine_id or unauthorized')
      }
    }

    const {
      recurrence_rule,
      recurrence_parent_id,
      external_provider,
      external_id,
      external_link,
      source_metadata,
      ...coreTaskData
    } = taskData

    const payload = {
      ...coreTaskData,
      routine_id: routineId,
      scheduled_at: taskData.scheduled_at ? new Date(taskData.scheduled_at) : null,
      user_id: userId
    }

    const createdTask = await db.transaction(async (tx) => {
      const result = await tx.insert(tasks).values(payload).returning()
      const createdTask = result[0]

      if (recurrence_rule) {
        await tx.insert(taskRecurrences).values({
          task_id: createdTask.id,
          user_id: userId,
          recurrence_rule,
          recurrence_parent_id
        })
      }

      if (external_provider && external_id) {
        await tx.insert(taskExternalMetadata).values({
          task_id: createdTask.id,
          user_id: userId,
          external_provider,
          external_id,
          external_link,
          source_metadata
        })
      }

      return createdTask
    })

    await this.invalidateDashboardSummaries(userId, [createdTask.scheduled_at])
    return createdTask
  }

  static async updateTask(userId: string, taskId: string, updates: any) {
    const {
      recurrence_rule,
      recurrence_parent_id,
      external_provider,
      external_id,
      external_link,
      source_metadata,
      ...coreUpdates
    } = updates

    const updatePayload: any = {
      ...coreUpdates,
      updated_at: new Date()
    }
    if (coreUpdates.scheduled_at !== undefined) {
      updatePayload.scheduled_at = coreUpdates.scheduled_at ? new Date(coreUpdates.scheduled_at) : null
    }

    const existingTask = await db.select({ scheduled_at: tasks.scheduled_at, is_time_locked: tasks.is_time_locked }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.user_id, userId))).limit(1)
    if (!existingTask.length) {
      throw new Error('Task not found or unauthorized')
    }

    const previousScheduledAt = existingTask[0]?.scheduled_at
    const isTimeLocked = existingTask[0]?.is_time_locked

    // Reject manual time modifications for time-locked tasks
    if (isTimeLocked && coreUpdates.scheduled_at !== undefined) {
      const newTime = coreUpdates.scheduled_at ? new Date(coreUpdates.scheduled_at).getTime() : null
      const oldTime = previousScheduledAt ? previousScheduledAt.getTime() : null
      
      if (newTime !== oldTime) {
        throw new Error('Cannot reschedule a time-locked task. Please unlock it first.')
      }
    }

    const updatedTask = await db.transaction(async (tx) => {
      const result = await tx
        .update(tasks)
        .set(updatePayload)
        .where(and(eq(tasks.id, taskId), eq(tasks.user_id, userId)))
        .returning()

      if (!result.length) {
        throw new Error('Task not found or unauthorized')
      }

      const updatedTask = result[0]

      // Handle recurrences
      if (recurrence_rule !== undefined) {
        const existingRecurrence = await tx.select().from(taskRecurrences).where(eq(taskRecurrences.task_id, taskId)).limit(1)
        if (existingRecurrence.length > 0) {
          await tx.update(taskRecurrences)
            .set({ recurrence_rule, recurrence_parent_id, updated_at: new Date() })
            .where(eq(taskRecurrences.task_id, taskId))
        } else if (recurrence_rule) {
          await tx.insert(taskRecurrences).values({
            task_id: taskId,
            user_id: userId,
            recurrence_rule,
            recurrence_parent_id
          })
        }
      }

      // Handle external metadata
      if (external_provider !== undefined || external_id !== undefined) {
        const existingExternal = await tx.select().from(taskExternalMetadata).where(eq(taskExternalMetadata.task_id, taskId)).limit(1)
        if (existingExternal.length > 0) {
           await tx.update(taskExternalMetadata)
             .set({ external_provider, external_id, external_link, source_metadata, updated_at: new Date() })
             .where(eq(taskExternalMetadata.task_id, taskId))
        } else if (external_provider && external_id) {
           await tx.insert(taskExternalMetadata).values({
            task_id: taskId,
            user_id: userId,
            external_provider,
            external_id,
            external_link,
            source_metadata
          })
        }
      }

      return updatedTask
    })

    await this.invalidateDashboardSummaries(userId, [previousScheduledAt, updatedTask.scheduled_at])
    return updatedTask
  }

  static async deleteTask(userId: string, taskId: string) {
    const result = await db.transaction(async (tx) => {
      const deleted = await tx
        .delete(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.user_id, userId)))
        .returning()

      if (deleted.length > 0) {
        await tx.insert(tombstones).values({
          user_id: userId,
          table_name: 'tasks',
          record_id: taskId,
          deleted_by_session_id: null
        })
      }
      return deleted
    })

    if (!result.length) {
      throw new Error('Task not found or unauthorized')
    }

    await this.invalidateDashboardSummaries(userId, [result[0].scheduled_at])
    return result[0]
  }

  /**
   * Create a subtask for a parent task
   */
  static async createSubtask(userId: string, parentTaskId: string, input: CreateSubtaskInput) {
    // Verify parent task ownership
    const [parentTask] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, parentTaskId), eq(tasks.user_id, userId)))

    if (!parentTask) {
      throw new Error('Parent task not found or unauthorized')
    }

    // Get max order index for this parent
    const [maxOrder] = await db
      .select({ maxIndex: tasks.order_index })
      .from(tasks)
      .where(eq(tasks.parent_task_id, parentTaskId))
      .orderBy(desc(tasks.order_index))
      .limit(1)

    const nextOrderIndex = maxOrder ? maxOrder.maxIndex + 1 : 0

    const [subtask] = await db
      .insert(tasks)
      .values({
        user_id: userId,
        routine_id: parentTask.routine_id,
        parent_task_id: parentTaskId,
        title: input.title,
        description: input.description,
        priority: input.priority || parentTask.priority,
        status: 'not_started',
        category: parentTask.category,
        scheduled_at: input.scheduled_at !== undefined ? (input.scheduled_at ? new Date(input.scheduled_at) : null) : parentTask.scheduled_at,
        estimated_duration_minutes: input.estimated_duration_minutes || 15,
        order_index: nextOrderIndex,
      })
      .returning()

    return subtask
  }

  /**
   * List subtasks for a parent task
   */
  static async listSubtasks(userId: string, parentTaskId: string) {
    // Verify parent task ownership
    const [parentTask] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, parentTaskId), eq(tasks.user_id, userId)))

    if (!parentTask) {
      throw new Error('Parent task not found or unauthorized')
    }

    const subtasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.parent_task_id, parentTaskId), eq(tasks.user_id, userId)))
      .orderBy(tasks.order_index)

    return subtasks
  }

  /**
   * Update a subtask
   */
  static async updateSubtask(userId: string, subtaskId: string, updates: Partial<CreateSubtaskInput> & { status?: string }) {
    const [subtask] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, subtaskId), eq(tasks.user_id, userId)))

    if (!subtask) {
      throw new Error('Subtask not found or unauthorized')
    }

    const updateData: any = {
      updated_at: new Date(),
    }
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.priority !== undefined) updateData.priority = updates.priority
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.estimated_duration_minutes !== undefined) updateData.estimated_duration_minutes = updates.estimated_duration_minutes
    if (updates.scheduled_at !== undefined) updateData.scheduled_at = updates.scheduled_at ? new Date(updates.scheduled_at) : null

    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, subtaskId))
      .returning()

    return updated
  }

  /**
   * Delete a subtask
   */
  static async deleteSubtask(userId: string, subtaskId: string) {
    const [subtask] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, subtaskId), eq(tasks.user_id, userId)))

    if (!subtask) {
      throw new Error('Subtask not found or unauthorized')
    }

    await db.delete(tasks).where(eq(tasks.id, subtaskId))
  }

  /**
   * Reorder subtasks
   */
  static async reorderSubtasks(userId: string, parentTaskId: string, subtaskIds: string[]) {
    // Verify parent task ownership
    const [parentTask] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, parentTaskId), eq(tasks.user_id, userId)))

    if (!parentTask) {
      throw new Error('Parent task not found or unauthorized')
    }

    return db.transaction(async (tx) => {
      for (let i = 0; i < subtaskIds.length; i++) {
        await tx
          .update(tasks)
          .set({ order_index: i, updated_at: new Date() })
          .where(and(eq(tasks.id, subtaskIds[i]), eq(tasks.user_id, userId)))
      }
    })
  }

  /**
   * Complete all subtasks
   */
  static async completeAllSubtasks(userId: string, parentTaskId: string) {
    // Verify parent task ownership
    const [parentTask] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, parentTaskId), eq(tasks.user_id, userId)))

    if (!parentTask) {
      throw new Error('Parent task not found or unauthorized')
    }

    await db
      .update(tasks)
      .set({ status: 'completed', updated_at: new Date() })
      .where(and(eq(tasks.parent_task_id, parentTaskId), eq(tasks.user_id, userId)))
  }
}
