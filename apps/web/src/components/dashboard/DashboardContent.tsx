"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    CheckCircle2,
    Clock,
    Calendar as CalendarIcon,
    ArrowUpRight,
    Mail,
    Video,
    CreditCard,
    Sparkles
} from "lucide-react"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { EditTaskModal } from "@/components/tasks/EditTaskModal"
import { useEvents } from "@/hooks/useEvents"
import { useListNavigation } from "@/hooks/useListNavigation"
import { useTasks, useUpdateTask, useDeleteTask } from "@/hooks/useTasks"
import { useTaskStore } from "@/store/useTaskStore"
import { apiClient } from "@/utils/apiClient"

const STATS_ICONS = {
    tasksCompleted: { icon: CheckCircle2, colorClass: "text-green-500", gradientClass: "gradient-green" },
    focusTime: { icon: Clock, colorClass: "text-blue-500", gradientClass: "gradient-blue" },
    meetings: { icon: CalendarIcon, colorClass: "text-purple-500", gradientClass: "gradient-purple" }
}

export function DashboardContent({ user }: { user?: any }) {
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [dismissedConflictIds, setDismissedConflictIds] = useState<string[]>([])
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [stats, setStats] = useState<any>(null)
    const [isLoadingStats, setIsLoadingStats] = useState(true)
    const [summaryError, setSummaryError] = useState<string | null>(null)
    const { openModal } = useTaskStore()
    const isNewTaskOpen = useTaskStore(state => state.isTaskModalOpen)
    const [editTask, setEditTask] = useState<any | null>(null)

    const { mutate: updateTask } = useUpdateTask()
    const { mutate: deleteTask } = useDeleteTask()
    const [todaysTasks, setTodaysTasks] = useState<any[]>([])

    const loadSummary = async () => {
        try {
            const res = await apiClient.dashboard.getSummary()
            if (res.success) {
                setStats(res.data.stats)
                setTodaysTasks(
                    [...(res.data.tasks || [])].sort((a, b) => {
                        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
                    })
                )
                setSummaryError(null)
            }
        } catch {
            setSummaryError("Dashboard summary is unavailable right now.")
        } finally {
            setIsLoadingStats(false)
        }
    }

    useEffect(() => {
        loadSummary()
    }, [])

    const handleTaskCreated = async () => {
        setIsLoadingStats(true)
        await loadSummary()
    }

    const conflicts = useMemo(() => {
        const overlaps = []
        for (let i = 0; i < todaysTasks.length - 1; i++) {
            const current = todaysTasks[i]
            const next = todaysTasks[i + 1]
            const currentEnd = new Date(current.scheduled_at).getTime() + (current.estimated_duration_minutes * 60000)
            const nextStart = new Date(next.scheduled_at).getTime()
            if (nextStart < currentEnd) {
                overlaps.push({ task1: current, task2: next })
            }
        }
        return overlaps
    }, [todaysTasks])

    const conflictSuggestions = useMemo(() => {
        return conflicts.map((conflict) => ({
            id: `conflict-${conflict.task1.id}-${conflict.task2.id}`,
            text: `Resolve conflict between "${conflict.task1.title}" and "${conflict.task2.title}"`,
            action: "Resolve",
            isConflict: true,
        }))
    }, [conflicts])

    const visibleSuggestions = useMemo(() => {
        return [...conflictSuggestions, ...suggestions].filter((item) => !dismissedConflictIds.includes(item.id))
    }, [conflictSuggestions, suggestions, dismissedConflictIds])

    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || "there"

    const { focusedIndex, setFocusedIndex } = useListNavigation({
        itemCount: todaysTasks.length,
        disabled: !!editTask || isNewTaskOpen,
        onSelect: (index) => setEditTask(todaysTasks[index]),
        onUnschedule: (index) => updateTask({ id: todaysTasks[index].id, scheduled_at: null }),
        onDelete: (index) => deleteTask(todaysTasks[index].id),
        initialIndex: -1,
    })

    const dismissSuggestion = (id: string) => {
        if (id.startsWith('conflict-')) {
            setDismissedConflictIds(prev => [...prev, id])
            return
        }
        setSuggestions(prev => prev.filter(s => s.id !== id))
    }

    const executeSuggestion = async (id: string, text: string) => {
        setLoadingId(id)
        try {
            // Trigger Fastify AI engine to process the suggestion context
            const res = await apiClient.ai.rescheduleTasks(text, todaysTasks)
            if (res.success) {
                dismissSuggestion(id)
            }
        } catch (error) {
            console.error("AI execution failed:", error)
        } finally {
            setLoadingId(null)
        }
    }

    const liveStats = [
        { title: "Tasks Completed", value: stats?.tasksCompleted || "0", trend: "0", ...STATS_ICONS.tasksCompleted },
        { title: "Focus Time", value: stats?.focusTimeMinutes ? `${Math.round(stats.focusTimeMinutes / 60)}h ${stats.focusTimeMinutes % 60}m` : "0h", trend: "0h", ...STATS_ICONS.focusTime },
        { title: "Meetings", value: stats?.meetings || "0", trend: "0", ...STATS_ICONS.meetings },
    ]

    return (
        <div className="flex flex-col h-full w-full bg-transparent" data-purpose="dashboard-page">
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 bg-card rounded-tl-[32px] border-t border-border flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
                        {/* ── Stats Row ── */}
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {liveStats.map((stat, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "relative p-6 rounded-2xl border border-border shadow-sm bg-card overflow-hidden group",
                                        stat.gradientClass
                                    )}
                                >
                                    <div className="relative z-10 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("p-2.5 rounded-xl bg-muted shadow-sm border border-border", stat.colorClass)}>
                                                <Icon icon={stat.icon} size="md" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{stat.title}</p>
                                                <h3 className="text-2xl font-bold text-foreground tracking-tight leading-none mt-1">
                                                    {isLoadingStats ? <Skeleton className="h-6 w-16" /> : stat.value}
                                                </h3>
                                            </div>
                                        </div>
                                        <span className="flex items-center text-xs font-bold text-status-done bg-status-done/10 px-2 py-1 rounded-lg">
                                            <ArrowUpRight size={12} className="mr-0.5" />
                                            {stat.trend}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </section>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* ── Main Column: Today's Plan & Conflicts ── */}
                            <div className="space-y-6">

                                {/* Today's Plan */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                            <Icon icon={CalendarIcon} size="sm" className="text-primary" />
                                            Today's Plan
                                        </h2>
                                    </div>

                                    <div className="space-y-2">
                                        {summaryError ? (
                                            <div className="p-8 text-center text-destructive font-medium border border-dashed border-destructive/30 bg-destructive/10 rounded-2xl">
                                                {summaryError}
                                            </div>
                                        ) : isLoadingStats ? (
                                            <div className="space-y-2">
                                                {[1, 2, 3].map((i) => (
                                                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border bg-card border-border">
                                                        <Skeleton className="h-10 w-10 rounded-xl" />
                                                        <div className="flex-1 space-y-2">
                                                            <Skeleton className="h-4 w-3/4" />
                                                            <Skeleton className="h-3 w-1/4" />
                                                        </div>
                                                        <Skeleton className="h-4 w-12" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : todaysTasks.length === 0 ? (
                                            <div className="p-8 text-center text-muted-foreground font-medium border border-dashed border-border bg-card rounded-2xl">
                                                No tasks scheduled for today.
                                            </div>
                                        ) : (
                                            todaysTasks.map((item, i) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => setEditTask(item)}
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-2xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 group cursor-pointer",
                                                        i === focusedIndex ? "border-primary ring-2 ring-primary/20" : "border-border"
                                                    )}
                                                >
                                                    <div className="p-2.5 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-border">
                                                        <Icon icon={item.external_provider === 'zoom' ? Video : item.external_provider === 'gmail' ? Mail : CheckCircle2} size="md" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                                                        <p className="text-xs font-medium text-muted-foreground capitalize">
                                                            {item.estimated_duration_minutes} mins
                                                        </p>
                                                    </div>
                                                    <div className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                                                        {item.scheduled_at ? new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time'}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Side Column: AI Suggestions ── */}
                            <div className="space-y-4">
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Icon icon={Sparkles} size="sm" className="text-primary" />
                                    AI Suggestions
                                </h2>

                                <div className="space-y-3">
                                    {visibleSuggestions.length === 0 ? (
                                        <div
                                            className="p-6 text-center border border-dashed border-border bg-card rounded-2xl text-sm font-medium text-muted-foreground"
                                        >
                                            You're all caught up!
                                        </div>
                                    ) : (
                                        visibleSuggestions.map((s, i) => (
                                            <div
                                                key={s.id}
                                                className="p-5 rounded-2xl bg-card border border-border shadow-sm relative overflow-hidden"
                                            >
                                                <p className="text-sm text-foreground font-medium mb-3 relative z-10 leading-snug">
                                                    {s.text}
                                                </p>
                                                <div className="flex gap-2 relative z-10">
                                                    <button
                                                        onClick={() => executeSuggestion(s.id, s.text)}
                                                        disabled={loadingId === s.id}
                                                        className="flex-1 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                                                    >
                                                        {loadingId === s.id ? "Working..." : s.action}
                                                    </button>
                                                    <button
                                                        onClick={() => dismissSuggestion(s.id)}
                                                        className="px-3 py-1.5 text-xs font-bold bg-muted text-muted-foreground border border-border rounded-lg hover:bg-muted/80 hover:text-foreground transition-colors"
                                                    >
                                                        Dismiss
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <EditTaskModal
                open={!!editTask}
                onClose={() => setEditTask(null)}
                task={editTask}
            />

        </div>
    )
}
