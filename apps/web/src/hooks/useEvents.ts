"use client"
import { useTasks, type Task, type TaskQueryParams } from "./useTasks"
import { useRecurringProjections, type VirtualEvent } from "./useRecurringProjections"

export type CalendarEvent = {
    id: string
    title: string
    start: Date
    end: Date
    type: string
    task: Task
    isVirtual?: boolean
    masterTaskId?: string
}

export function useEvents(params?: TaskQueryParams & { windowStart?: Date; windowEnd?: Date }) {
    const { data: tasks, isLoading, error } = useTasks(params)

    const windowStart = params?.windowStart ?? new Date()
    const windowEnd = params?.windowEnd ?? new Date()

    // Generate virtual recurring events for the visible date window
    const virtualEvents = useRecurringProjections(tasks ?? [], windowStart, windowEnd)

    // Real events: scheduled tasks that are NOT a master recurring task
    // (master recurring tasks only appear via their virtual projections, unless
    //  their own scheduled_at falls in the window, in which case they show normally)
    const realEvents: CalendarEvent[] = (tasks ?? [])
        .filter((task) => {
            if (!task.scheduled_at) return false
            // Show all non-recurring tasks normally
            if (!task.recurrence_rule) return true
            // For recurring masters: show the master's own day as a real event,
            // but only if it falls within the visible window
            return true // The projection hook already skips the master's own day
        })
        .filter((task) => task.scheduled_at)
        .map((task) => {
            const start = new Date(task.scheduled_at!)
            const duration = task.actual_duration_minutes ?? task.estimated_duration_minutes ?? 30
            const end = new Date(start.getTime() + duration * 60000)

            return {
                id: task.id,
                title: task.title,
                start,
                end,
                type: task.category ?? "work",
                task,
                isVirtual: false,
            }
        })

    // Merge: real events take priority. Virtual events fill in gaps.
    const events: CalendarEvent[] = [
        ...realEvents,
        ...virtualEvents.map((v: VirtualEvent) => ({
            id: v.id,
            title: v.title,
            start: v.start,
            end: v.end,
            type: v.type,
            task: v.task,
            isVirtual: true,
            masterTaskId: v.masterTaskId,
        })),
    ]

    return { events, isLoading, error }
}
