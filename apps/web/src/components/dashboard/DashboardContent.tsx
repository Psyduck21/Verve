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
    Sparkles,
    Repeat
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
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { AIConfirmModal } from "../layout/AIConfirmModal"

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

    const { mutate: updateTask, mutateAsync: updateTaskAsync } = useUpdateTask()
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

    const [aiPlanToConfirm, setAiPlanToConfirm] = useState<any[] | null>(null)
    const [isConfirmingAIPlan, setIsConfirmingAIPlan] = useState(false)
    const [confirmingSuggestionId, setConfirmingSuggestionId] = useState<string | null>(null)

    const executeSuggestion = async (id: string, text: string) => {
        setLoadingId(id)
        try {
            const res = await apiClient.ai.rescheduleTasks(text, todaysTasks)
            if (res.success && res.data) {
                setAiPlanToConfirm(res.data)
                setConfirmingSuggestionId(id)
            }
        } catch (error) {
            console.error("AI execution failed:", error)
        } finally {
            setLoadingId(null)
        }
    }

    const handleConfirmAIPlan = async () => {
        if (!aiPlanToConfirm) return
        setIsConfirmingAIPlan(true)
        try {
            await Promise.all(aiPlanToConfirm.map(async (action: any) => {
                if ((action.action === "MOVE" || action.action === "UPDATE") && action.task_id) {
                    const updates: any = { id: action.task_id }
                    if (action.new_scheduled_at) updates.scheduled_at = action.new_scheduled_at
                    if (action.new_title) updates.title = action.new_title
                    if (action.new_priority) updates.priority = action.new_priority
                    if (action.new_duration_minutes) updates.estimated_duration_minutes = action.new_duration_minutes
                    await updateTaskAsync(updates)
                }
            }))
            if (confirmingSuggestionId) {
                dismissSuggestion(confirmingSuggestionId)
            }
        } catch (error) {
            console.error("Error executing AI plan:", error)
        } finally {
            setIsConfirmingAIPlan(false)
            setAiPlanToConfirm(null)
            setConfirmingSuggestionId(null)
        }
    }

    const liveStats = [
        { title: "Tasks Completed", value: stats?.tasksCompleted || "0", trend: "0", ...STATS_ICONS.tasksCompleted },
        { title: "Focus Time", value: stats?.focusTimeMinutes ? `${Math.round(stats.focusTimeMinutes / 60)}h ${stats.focusTimeMinutes % 60}m` : "0h", trend: "0h", ...STATS_ICONS.focusTime },
        { title: "Meetings", value: stats?.meetings || "0", trend: "0", ...STATS_ICONS.meetings },
    ]

    const pieData = useMemo(() => {
        const completed = todaysTasks.filter(t => t.status === 'completed').length
        const inProgress = todaysTasks.filter(t => t.status === 'in_progress').length
        const missed = todaysTasks.filter(t => t.status === 'missed').length
        const notStarted = todaysTasks.filter(t => t.status === 'not_started').length

        return [
            { name: 'Completed', value: completed, color: '#10b981' },
            { name: 'In Progress', value: inProgress, color: '#3b82f6' },
            { name: 'Missed', value: missed, color: '#ef4444' },
            { name: 'To Do', value: notStarted, color: '#8b5cf6' },
        ].filter(d => d.value > 0)
    }, [todaysTasks])

    const containerVariant: any = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
    }
    const itemVariant: any = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    }

    return (
        <div className="flex flex-col h-full w-full bg-transparent" data-purpose="dashboard-page">
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 bg-card rounded-tl-[32px] border-t border-border flex flex-col overflow-hidden relative">
                    {/* Background subtle gradients for that premium SaaS feel */}
                    <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

                    <motion.div 
                        className="flex-1 overflow-y-auto p-8 scrollbar-thin relative z-10"
                        variants={containerVariant}
                        initial="hidden"
                        animate="visible"
                    >
                        <div className="max-w-7xl mx-auto space-y-6">
                            
                            {/* Welcome Banner */}
                            <motion.div variants={itemVariant} className="mb-8">
                                <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                                    Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName}
                                </h1>
                                <p className="text-muted-foreground mt-1">Here is your schedule and focus overview for today.</p>
                            </motion.div>

                            {/* Main Bento Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-min">
                                
                                {/* Stats Row: 3 cards taking 4 cols each */}
                                {liveStats.map((stat, i) => (
                                    <motion.div
                                        variants={itemVariant}
                                        key={i}
                                        className="lg:col-span-4 p-6 rounded-[24px] border border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                                    >
                                        <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br", stat.gradientClass)} />
                                        <div className="relative z-10 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("p-3 rounded-2xl bg-muted/50 border border-border/50", stat.colorClass)}>
                                                    <Icon icon={stat.icon} size="md" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{stat.title}</p>
                                                    <h3 className="text-2xl font-black text-foreground tracking-tight mt-1">
                                                        {isLoadingStats ? <Skeleton className="h-6 w-16" /> : stat.value}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                {/* Today's Plan - Spans 8 cols */}
                                <motion.div variants={itemVariant} className="lg:col-span-8 lg:row-span-2 flex flex-col h-full rounded-[24px] border border-border/50 bg-card shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
                                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                                <Icon icon={CalendarIcon} size="sm" />
                                            </div>
                                            Today's Plan
                                        </h2>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col gap-3">
                                        {summaryError ? (
                                            <div className="flex-1 flex items-center justify-center p-8 text-destructive font-medium border border-dashed border-destructive/30 bg-destructive/10 rounded-2xl">
                                                {summaryError}
                                            </div>
                                        ) : isLoadingStats ? (
                                            <div className="space-y-3">
                                                {[1, 2, 3].map((i) => (
                                                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border/50">
                                                        <Skeleton className="h-10 w-10 rounded-xl" />
                                                        <div className="flex-1 space-y-2">
                                                            <Skeleton className="h-4 w-3/4" />
                                                            <Skeleton className="h-3 w-1/4" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : todaysTasks.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground border border-dashed border-border/50 rounded-2xl bg-muted/10">
                                                <CheckCircle2 className="w-12 h-12 mb-4 text-muted-foreground/30" />
                                                <p className="font-medium">No tasks scheduled for today.</p>
                                                <p className="text-sm">Enjoy your free time!</p>
                                            </div>
                                        ) : (
                                            todaysTasks.map((item, i) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => setEditTask(item)}
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-[20px] border bg-card hover:bg-muted/30 transition-all duration-200 group cursor-pointer",
                                                        i === focusedIndex ? "border-primary ring-1 ring-primary" : "border-border/50 hover:border-border"
                                                    )}
                                                >
                                                    <div className="p-3 rounded-xl bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-border/50">
                                                        <Icon icon={item.external_provider === 'zoom' ? Video : item.external_provider === 'gmail' ? Mail : CheckCircle2} size="sm" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[15px] font-bold text-foreground truncate">{item.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md capitalize">
                                                                {item.category || 'General'}
                                                            </span>
                                                            <span className="text-xs font-medium text-muted-foreground">
                                                                {item.estimated_duration_minutes} mins
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <div className="text-sm font-bold text-foreground">
                                                            {item.scheduled_at ? new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time'}
                                                        </div>
                                                        {item.recurrence_rule && (
                                                            <div className="flex items-center text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                                                                <Icon icon={Repeat} size="sm" className="w-3 h-3 mr-1" />
                                                                Recurring
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>

                                {/* Sidebar Column (4 cols) */}
                                <div className="lg:col-span-4 flex flex-col gap-6">
                                    
                                    {/* AI Suggestions */}
                                    <motion.div variants={itemVariant} className="rounded-[24px] border border-primary/20 bg-primary/5 shadow-sm overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <Sparkles className="w-24 h-24 text-primary" />
                                        </div>
                                        <div className="p-6 relative z-10">
                                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                                                <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                                                    <Icon icon={Sparkles} size="sm" />
                                                </div>
                                                Copilot
                                            </h2>
                                            
                                            <div className="space-y-3">
                                                {visibleSuggestions.length === 0 ? (
                                                    <div className="p-5 text-center bg-card/50 rounded-[16px] text-sm font-medium text-muted-foreground border border-border/50">
                                                        No new suggestions right now.
                                                    </div>
                                                ) : (
                                                    visibleSuggestions.map((s) => (
                                                        <div
                                                            key={s.id}
                                                            className="p-4 rounded-[16px] bg-card border border-border/50 shadow-sm"
                                                        >
                                                            <p className="text-sm text-foreground font-medium mb-3 leading-snug">
                                                                {s.text}
                                                            </p>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => executeSuggestion(s.id, s.text)}
                                                                    disabled={loadingId === s.id}
                                                                    className="flex-1 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                                                                >
                                                                    {loadingId === s.id ? "Working..." : s.action}
                                                                </button>
                                                                <button
                                                                    onClick={() => dismissSuggestion(s.id)}
                                                                    className="px-3 py-1.5 text-xs font-bold bg-transparent text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                                                                >
                                                                    Dismiss
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Analytics Donut */}
                                    <motion.div variants={itemVariant} className="rounded-[24px] border border-border/50 bg-card shadow-sm overflow-hidden flex flex-col">
                                        <div className="p-6 border-b border-border/50 bg-muted/20">
                                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-green-500/10 text-green-500">
                                                    <Icon icon={CheckCircle2} size="sm" />
                                                </div>
                                                Task Breakdown
                                            </h2>
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[260px] relative">
                                            {pieData.length > 0 ? (
                                                <>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                                                        <span className="text-4xl font-black text-foreground">{todaysTasks.length}</span>
                                                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Tasks</span>
                                                    </div>
                                                    <div className="w-full h-48 z-10 relative">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie
                                                                    data={pieData}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    innerRadius={65}
                                                                    outerRadius={85}
                                                                    paddingAngle={4}
                                                                    dataKey="value"
                                                                    stroke="none"
                                                                    cornerRadius={6}
                                                                >
                                                                    {pieData.map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip
                                                                    contentStyle={{ 
                                                                        borderRadius: '16px', 
                                                                        border: '1px solid hsl(var(--border))', 
                                                                        backgroundColor: 'hsl(var(--card) / 0.8)',
                                                                        backdropFilter: 'blur(12px)',
                                                                        boxShadow: '0 8px 32px -8px rgba(0,0,0,0.1)'
                                                                    }}
                                                                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                                                                />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-sm font-medium text-muted-foreground text-center">No data for today.</p>
                                            )}
                                        </div>
                                    </motion.div>

                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            <EditTaskModal
                open={!!editTask}
                onClose={() => setEditTask(null)}
                task={editTask}
            />

            <AIConfirmModal
                open={!!aiPlanToConfirm}
                actions={aiPlanToConfirm || []}
                tasks={todaysTasks}
                isSubmitting={isConfirmingAIPlan}
                onConfirm={handleConfirmAIPlan}
                onClose={() => {
                    setAiPlanToConfirm(null)
                    setConfirmingSuggestionId(null)
                }}
            />
        </div>
    )
}
