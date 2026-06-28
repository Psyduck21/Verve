"use client"
import { useTasks, type Task, type TaskQueryParams } from "./useTasks"

export type CalendarEvent = {
    id: string
    title: string
    start: Date
    end: Date
    type: string
    task: Task
}

export function useEvents(params?: TaskQueryParams) {
    const { data: tasks, isLoading, error } = useTasks(params)

    const events: CalendarEvent[] = (tasks ?? [])
        .filter((task) => task.scheduled_at)
        .map((task) => {
            const start = new Date(task.scheduled_at!)
            
            // Calculate end time
            const duration = task.actual_duration_minutes ?? task.estimated_duration_minutes ?? 30
            const end = new Date(start.getTime() + duration * 60000)

            return {
                id: task.id,
                title: task.title,
                start,
                end,
                type: task.category ?? "work",
                task,
            }
        })

    return { events, isLoading, error }
}
