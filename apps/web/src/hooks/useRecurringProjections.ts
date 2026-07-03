"use client"
import { useMemo } from "react"
import { RRule } from "rrule"
import type { Task } from "./useTasks"

export type VirtualEvent = {
    id: string
    title: string
    start: Date
    end: Date
    type: string
    isVirtual: true
    masterTaskId: string
    task: Task
}

/**
 * Given a list of tasks and a visible date window, projects virtual calendar
 * events for all recurring master tasks using rrule.
 *
 * - Master tasks (tasks with recurrence_rule and no parent_task_id) are projected.
 * - Dates where a real child task already exists (parent_task_id === master.id)
 *   are SKIPPED — the real child takes precedence.
 * - Memoized for performance: only recalculates when tasks or date window changes.
 */
export function useRecurringProjections(
    tasks: Task[],
    windowStart: Date,
    windowEnd: Date
): VirtualEvent[] {
    return useMemo(() => {
        // Build a Set of "<masterTaskId>|<ISO-date>" for real children already in DB
        // Use ISO string for precision (includes time) to avoid false positives
        const realChildDates = new Set<string>()
        for (const task of tasks) {
            if (task.parent_task_id && task.scheduled_at) {
                const dateKey = new Date(task.scheduled_at).toISOString()
                realChildDates.add(`${task.parent_task_id}|${dateKey}`)
            }
        }

        const virtualEvents: VirtualEvent[] = []

        for (const task of tasks) {
            // Only project master recurring tasks (no parent, has recurrence_rule)
            if (!task.recurrence_rule || task.parent_task_id) continue

            try {
                const rule = RRule.fromString(task.recurrence_rule)

                // Anchor the rule to the task's original scheduled_at time
                const dtstart = task.scheduled_at ? new Date(task.scheduled_at) : new Date()
                const rebuiltRule = new RRule({
                    ...rule.origOptions,
                    dtstart,
                })

                // Get all occurrence dates within the visible window
                const occurrences = rebuiltRule.between(windowStart, windowEnd, true)

                for (const occDate of occurrences) {
                    const dateKey = occDate.toISOString()
                    const skipKey = `${task.id}|${dateKey}`

                    // Skip if a real occurrence already exists for this exact date/time
                    if (realChildDates.has(skipKey)) continue

                    // Skip the master task's own day (it shows as a real event)
                    if (task.scheduled_at) {
                        const masterDateKey = new Date(task.scheduled_at).toISOString()
                        if (dateKey === masterDateKey) continue
                    }

                    const duration = task.estimated_duration_minutes ?? 30
                    const end = new Date(occDate.getTime() + duration * 60000)

                    virtualEvents.push({
                        id: `virtual-${task.id}-${occDate.getTime()}`,
                        title: task.title,
                        start: occDate,
                        end,
                        type: task.category ?? "work",
                        isVirtual: true,
                        masterTaskId: task.id,
                        task,
                    })
                }
            } catch (e) {
                console.warn(`useRecurringProjections: invalid rule for task ${task.id}:`, e)
            }
        }

        return virtualEvents
    }, [tasks, windowStart, windowEnd])
}
