import { db } from '../../lib/db'
import { tasks, routines, tombstones, taskRecurrences, taskExternalMetadata, notificationSchedules, webPushSubscriptions, taskCompletions } from '@verve/db'
import { eq, and, desc, isNull } from '@verve/db'
import { z } from 'zod'
import { redis, RedisKeys } from '../../lib/redis'
import { CacheService } from '../../lib/cache'
import { realtimeService } from '../../lib/realtime'
import { notificationQueue } from '../../lib/queue'

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

  /**
   * Get user routine with multi-level caching
   */
  private static async getUserRoutine(userId: string) {
    const cacheKey = `user:routine:${userId}`
    const cached = await CacheService.get(cacheKey)
    if (cached) return cached as Array<{ id: string }>
    
    const routine = await db
      .select({ id: routines.id })
      .from(routines)
      .where(eq(routines.user_id, userId))
      .limit(1)
    
    await CacheService.set(cacheKey, routine, { ttl: 600, tags: [`user:${userId}`] })
    return routine
  }

  private static async syncNotifications(tx: any, userId: string, taskId: string, taskTitle: string, scheduledAt: Date | null) {
    // Delete existing un-sent notifications for this task
    await tx.delete(notificationSchedules)
      .where(and(eq(notificationSchedules.task_id, taskId), isNull(notificationSchedules.sent_at)))
      
    if (!scheduledAt) return;
    
    // Check if the scheduled time is in the future
    const notifyTime = new Date(scheduledAt.getTime() - 15 * 60000)
    if (notifyTime <= new Date()) return;
    
    const subs = await tx.select().from(webPushSubscriptions).where(and(eq(webPushSubscriptions.user_id, userId), eq(webPushSubscriptions.active, true)))
    
    if (subs.length === 0) return;

    await tx.insert(notificationSchedules).values(subs.map((sub: any) => ({
      user_id: userId,
      task_id: taskId,
      subscription_id: sub.id,
      scheduled_for: notifyTime,
      title: 'Upcoming Task',
      body: `"${taskTitle}" starts in 15 minutes.`,
    })))
  }

  static async createTask(userId: string, taskData: any) {
    let routineId = taskData.routine_id
    
    // Optimized: Batch fetch validation data in parallel
    const [routine, parentTask] = await Promise.all([
      taskData.routine_id 
        ? db.select({ id: routines.id }).from(routines)
            .where(and(eq(routines.id, taskData.routine_id), eq(routines.user_id, userId)))
            .limit(1)
        : Promise.resolve([]),
      taskData.parent_task_id
        ? db.select({ id: tasks.id }).from(tasks)
            .where(and(eq(tasks.id, taskData.parent_task_id), eq(tasks.user_id, userId)))
            .limit(1)
        : Promise.resolve([])
    ])
    
    if (!routineId) {
      // Use cached routine lookup
      const userRoutines = await this.getUserRoutine(userId)
      if (userRoutines.length) {
        routineId = userRoutines[0].id
      } else {
        const [newRoutine] = await db
          .insert(routines)
          .values({ user_id: userId, title: 'Default Routine' })
          .returning({ id: routines.id })
        routineId = newRoutine.id
        // Invalidate cache after creating new routine
        await CacheService.del(`user:routine:${userId}`)
      }
    } else if (routine.length === 0) {
      throw new Error('Invalid routine_id or unauthorized')
    }
    
    // Validate parent task if provided
    if (taskData.parent_task_id && parentTask.length === 0) {
      throw new Error('Parent task not found or unauthorized')
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

      await TasksService.syncNotifications(tx, userId, createdTask.id, createdTask.title, createdTask.scheduled_at)

      return createdTask
    })

    await this.invalidateDashboardSummaries(userId, [createdTask.scheduled_at])
    
    // Invalidate user-related caches
    await CacheService.invalidateTag(`user:${userId}`)
    
    if (recurrence_rule) {
      await notificationQueue.add('check-recurrences', {}, { jobId: `manual-trigger-${Date.now()}`, priority: 1 })
    }

    // Broadcast creation to clients
    await realtimeService.broadcastEvent(userId, 'task_created', createdTask)
    
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

      // Optimized: Batch fetch recurrence and external metadata in parallel
      const [existingRecurrence, existingExternal] = await Promise.all([
        recurrence_rule !== undefined 
          ? tx.select().from(taskRecurrences).where(eq(taskRecurrences.task_id, taskId)).limit(1)
          : Promise.resolve([]),
        (external_provider !== undefined || external_id !== undefined)
          ? tx.select().from(taskExternalMetadata).where(eq(taskExternalMetadata.task_id, taskId)).limit(1)
          : Promise.resolve([])
      ])

      // Handle recurrences
      if (recurrence_rule !== undefined) {
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

      if (updatedTask.status === 'completed' || updatedTask.status === 'cancelled') {
        await tx.delete(notificationSchedules).where(and(eq(notificationSchedules.task_id, taskId), isNull(notificationSchedules.sent_at)))
      } else {
        await TasksService.syncNotifications(tx, userId, updatedTask.id, updatedTask.title, updatedTask.scheduled_at)
      }

      if (coreUpdates.status === 'completed') {
        const scheduledAt = updatedTask.scheduled_at || new Date()
        const estimated = updatedTask.estimated_duration_minutes || 30
        const actual = coreUpdates.actual_duration_minutes || estimated
        const diffMs = new Date().getTime() - scheduledAt.getTime()
        const varianceMins = Math.round(diffMs / 60000)
        
        await tx.insert(taskCompletions).values({
          task_id: taskId,
          user_id: userId,
          routine_id: updatedTask.routine_id as string,
          status: 'completed',
          completed_at: new Date(),
          actual_duration_minutes: actual,
          was_on_time: varianceMins <= 15,
          minutes_variance: varianceMins,
          scheduled_at: scheduledAt,
          day_of_week: scheduledAt.getDay(),
          week_number: 1, // simplified for now
          hour_of_day: scheduledAt.getHours(),
          priority: updatedTask.priority,
          category: updatedTask.category
        }).onConflictDoNothing()
      }

      return updatedTask
    })

    await this.invalidateDashboardSummaries(userId, [previousScheduledAt, updatedTask.scheduled_at])

    // Invalidate user-related caches
    await CacheService.invalidateTag(`user:${userId}`)

    // Manually trigger a check for recurrences if the task is completed or recurrence rule was changed
    if (coreUpdates.status === 'completed' || recurrence_rule !== undefined) {
      await notificationQueue.add('check-recurrences', {}, { jobId: `manual-trigger-${Date.now()}`, priority: 1 })
    }

    // Broadcast update to clients
    await realtimeService.broadcastEvent(userId, 'task_updated', updatedTask)
    
    return updatedTask
  }

  /**
   * Materialize a virtual recurring occurrence into a real DB row.
   * Called when the user interacts with a projected virtual event on the calendar.
   * The new task is a "recurrence exception" — a child of the master task.
   */
  static async materializeOccurrence(userId: string, masterTaskId: string, scheduledAt: string, estimatedDurationMinutes?: number) {
    // Fetch the master task to copy its metadata
    const [master] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, masterTaskId), eq(tasks.user_id, userId)))
      .limit(1)

    if (!master) throw new Error('Master task not found or unauthorized')

    // Check if a real occurrence already exists for this exact date (idempotent)
    const scheduledDate = new Date(scheduledAt)
    const existingChild = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.parent_task_id, masterTaskId),
          eq(tasks.scheduled_at, scheduledDate)
        )
      )
      .limit(1)

    if (existingChild.length > 0) {
      // Already materialized — return the existing task
      const [existing] = await db.select().from(tasks).where(eq(tasks.id, existingChild[0].id)).limit(1)
      return existing
    }

    // Create the real occurrence as a child of the master task
    return this.createTask(userId, {
      title: master.title,
      description: master.description,
      priority: master.priority,
      category: master.category,
      estimated_duration_minutes: estimatedDurationMinutes ?? master.estimated_duration_minutes,
      scheduled_at: scheduledAt,
      routine_id: master.routine_id,
      parent_task_id: masterTaskId,
      status: 'not_started',
    })
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
        await tx.delete(notificationSchedules).where(and(eq(notificationSchedules.task_id, taskId), isNull(notificationSchedules.sent_at)))
      }
      return deleted
    })

    if (!result.length) {
      throw new Error('Task not found or unauthorized')
    }

    await this.invalidateDashboardSummaries(userId, [result[0].scheduled_at])

    // Broadcast deletion to clients
    await realtimeService.broadcastEvent(userId, 'task_deleted', { id: taskId })

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
