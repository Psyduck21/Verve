"use client"

import { useMemo } from "react"
import { Task } from "@/hooks/useTasks"

interface TasksOverviewMetricsProps {
    tasks: Task[]
}

export function TasksOverviewMetrics({ tasks }: TasksOverviewMetricsProps) {
    const stats = useMemo(() => {
        const total = tasks.length
        let done = 0
        let overdue = 0
        let high = 0
        let medium = 0
        let low = 0

        const now = new Date()

        tasks.forEach(t => {
            if (t.status === "completed") done++
            else if (t.scheduled_at && new Date(t.scheduled_at) < now) overdue++

            if (t.priority === "high" || t.priority === "critical") high++
            else if (t.priority === "medium") medium++
            else if (t.priority === "low") low++
        })

        return { total, done, overdue, high, medium, low }
    }, [tasks])

    return (
        <div className="flex flex-col md:flex-row gap-4 w-full mb-8 shrink-0">
            {/* Left Card: Priority Breakdown */}
            <div className="flex-1 flex flex-col p-4 px-6 border border-border rounded-2xl bg-card shadow-sm">
                <h3 className="text-sm font-bold text-muted-foreground mb-4">Priority Breakdown</h3>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-foreground tracking-tight leading-none">{stats.high}</span>
                        <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md">High</span>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-foreground tracking-tight leading-none">{stats.medium}</span>
                        <span className="text-xs font-semibold text-[hsl(var(--status-review))] bg-[hsl(var(--status-review)/0.1)] px-2 py-0.5 rounded-md">Medium</span>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-foreground tracking-tight leading-none">{stats.low}</span>
                        <span className="text-xs font-semibold text-[hsl(var(--status-progress))] bg-[hsl(var(--status-progress)/0.1)] px-2 py-0.5 rounded-md">Low</span>
                    </div>
                </div>
            </div>

            {/* Right Card: Status Breakdown */}
            <div className="flex-1 flex flex-col p-4 px-6 border border-border rounded-2xl bg-card shadow-sm">
                <h3 className="text-sm font-bold text-muted-foreground mb-4">Status Breakdown</h3>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-foreground tracking-tight leading-none">{stats.total}</span>
                        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">Total</span>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-foreground tracking-tight leading-none">{stats.done}</span>
                        <span className="text-xs font-semibold text-[hsl(var(--status-done))] bg-[hsl(var(--status-done)/0.1)] px-2 py-0.5 rounded-md">Done</span>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-foreground tracking-tight leading-none">{stats.overdue}</span>
                        <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md">Overdue</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
