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
import { EditTaskModal } from "@/components/tasks/EditTaskModal"
import { apiClient } from "@/utils/apiClient"
import { useTasks } from "@/hooks/useTasks"
import { NewTaskSheet } from "@/components/tasks/NewTaskSheet"

const STATS_ICONS = {
    tasksCompleted: { icon: CheckCircle2, colorClass: "text-green-500", gradientClass: "gradient-green" },
    focusTime: { icon: Clock, colorClass: "text-blue-500", gradientClass: "gradient-blue" },
    meetings: { icon: CalendarIcon, colorClass: "text-purple-500", gradientClass: "gradient-purple" }
}

// Removed mock INBOX_ITEMS
const AI_SUGGESTIONS = [
    { id: "s1", text: "You have 2 hours free. Move 'Write docs' here?", action: "Reschedule" },
    { id: "s2", text: "3 tasks overdue. Batch them into a focus block?", action: "Batch Tasks" },
]

export function DashboardContent({ user }: { user?: any }) {
    const [suggestions, setSuggestions] = useState(AI_SUGGESTIONS)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [stats, setStats] = useState<any>(null)
    const [isLoadingStats, setIsLoadingStats] = useState(true)
    const [isNewTaskOpen, setIsNewTaskOpen] = useState(false)
    const [editTask, setEditTask] = useState<any | null>(null)
    const [focusedIndex, setFocusedIndex] = useState(-1)
    const [todaysTasks, setTodaysTasks] = useState<any[]>([])

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0]
        apiClient.dashboard.getSummary().then(res => {
            if (res.success) {
                setStats(res.data.stats)
                setTodaysTasks(res.data.tasks || [])
            }
            setIsLoadingStats(false)
        }).catch(() => {
            setIsLoadingStats(false)
        })
    }, [])

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

    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || "there"

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (editTask || isNewTaskOpen) return;
            if (todaysTasks.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setFocusedIndex(prev => (prev < todaysTasks.length - 1 ? prev + 1 : prev))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev))
            } else if ((e.key === 'Enter' || e.key === 'e') && focusedIndex >= 0) {
                e.preventDefault()
                setEditTask(todaysTasks[focusedIndex])
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [todaysTasks, focusedIndex, editTask, isNewTaskOpen])

    useEffect(() => {
        apiClient.dashboard.getSummary().then(res => {
            if (res.success) {
                setStats(res.data.stats)
            }
            setIsLoadingStats(false)
        }).catch(() => {
            setIsLoadingStats(false)
        })
    }, [])

    const dismissSuggestion = (id: string) => {
        setSuggestions(prev => prev.filter(s => s.id !== id))
    }

    const executeSuggestion = async (id: string, text: string) => {
        setLoadingId(id)
        try {
            // Trigger Fastify AI engine to process the suggestion context
            const res = await apiClient.ai.rescheduleTasks(
                todaysTasks.map((t: any) => t.id),
                JSON.stringify({ command: text, tasks: todaysTasks })
            )
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
                                                {isLoadingStats ? "..." : stat.value}
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

                            {/* Task Conflicts Alert */}
                            {conflicts.length > 0 && (
                                <div className="p-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive">
                                    <h3 className="font-bold flex items-center gap-2 mb-2">
                                        <Icon icon={Sparkles} size="sm" />
                                        Schedule Conflicts Detected
                                    </h3>
                                    <div className="space-y-2">
                                        {conflicts.map((c, i) => (
                                            <div key={i} className="text-sm font-medium">
                                                "{c.task1.title}" overlaps with "{c.task2.title}"
                                            </div>
                                        ))}
                                    </div>
                                    <button className="mt-4 px-3 py-1.5 text-xs font-bold bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors">
                                        Resolve with AI
                                    </button>
                                </div>
                            )}

                            {/* Today's Plan */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                        <Icon icon={CalendarIcon} size="sm" className="text-primary" />
                                        Today's Plan
                                    </h2>
                                </div>

                                <div className="space-y-2">
                                    {todaysTasks.length === 0 ? (
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
                                {suggestions.length === 0 ? (
                                    <div
                                        className="p-6 text-center border border-dashed border-border bg-card rounded-2xl text-sm font-medium text-muted-foreground"
                                    >
                                        You're all caught up!
                                    </div>
                                ) : (
                                    suggestions.map((s, i) => (
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
            
            <EditTaskModal
                open={!!editTask}
                onClose={() => setEditTask(null)}
                task={editTask}
            />

            <NewTaskSheet
                isOpen={isNewTaskOpen}
                onClose={() => setIsNewTaskOpen(false)}
            />
        </div>
    )
}
