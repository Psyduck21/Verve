import { db } from '../../lib/db'
import { tasks } from '@verve/db'
import { and, eq, lte, gte } from '@verve/db'
import { FastifyBaseLogger } from 'fastify'

export interface CapacityResult {
  totalAvailableMinutes: number;
  scheduledMinutes: number;
  utilizationPercentage: number;
  isOverCapacity: boolean;
}

export class CapacityService {
  constructor(private logger: FastifyBaseLogger) {}

  /**
   * Calculates the capacity utilization for a user on a given day.
   * "True Capacity" Sync Foundation: Helps B2B users know if they are over-scheduled.
   */
  async calculateDailyCapacity(userId: string, date: Date): Promise<CapacityResult> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // Define a standard working day capacity (e.g. 8 hours)
    // In a real enterprise app, this would be fetched from user preferences or team settings.
    const totalAvailableMinutes = 8 * 60; 

    // Fetch all tasks scheduled for this day
    const scheduledTasks = await db.query.tasks.findMany({
      where: and(
        eq(tasks.user_id, userId),
        gte(tasks.scheduled_at, startOfDay),
        lte(tasks.scheduled_at, endOfDay)
      )
    })

    let scheduledMinutes = 0;
    for (const task of scheduledTasks) {
      // If task is completed, we might look at actual duration, else estimated
      if (task.status === 'completed' && task.actual_duration_minutes) {
        scheduledMinutes += task.actual_duration_minutes;
      } else {
        scheduledMinutes += (task.estimated_duration_minutes || 0);
      }
    }

    const utilizationPercentage = totalAvailableMinutes > 0 ? Math.round((scheduledMinutes / totalAvailableMinutes) * 100) : 0;
    const isOverCapacity = scheduledMinutes > totalAvailableMinutes;

    return {
      totalAvailableMinutes,
      scheduledMinutes,
      utilizationPercentage,
      isOverCapacity
    }
  }
}
