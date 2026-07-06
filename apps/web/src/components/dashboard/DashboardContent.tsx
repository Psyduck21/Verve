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
    Repeat,
    TrendingUp,
    TrendingDown,
    Flame,
    Award,
    CalendarDays,
    BarChart3,
    Target,
    Zap,
    ChevronRight,
    MoreHorizontal,
    Play,
    Pause,
    AlertCircle,
    X
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
import dynamic from "next/dynamic"
import { AIConfirmModal } from "../layout/AIConfirmModal"

// P1-B: recharts (~120KB) is lazy-loaded so it's excluded from the critical bundle.
// It only loads when the chart is about to be rendered (below-the-fold content).
const TaskBreakdownChart = dynamic(
    () => import("./TaskBreakdownChart").then(m => m.TaskBreakdownChart),
    { ssr: false, loading: () => <Skeleton className="h-48 w-full rounded-2xl" /> }
)

const WeeklyChart = dynamic(
    () => import("./WeeklyChart").then(m => m.WeeklyChart),
    { ssr: false, loading: () => <Skeleton className="h-48 w-full rounded-2xl" /> }
)

const STATS_ICONS = {
    tasksCompleted: { icon: CheckCircle2, colorClass: "text-emerald-500", gradientClass: "from-emerald-500/20 to-emerald-600/5", borderColor: "border-emerald-500/20" },
    focusTime: { icon: Clock, colorClass: "text-blue-500", gradientClass: "from-blue-500/20 to-blue-600/5", borderColor: "border-blue-500/20" },
    meetings: { icon: CalendarIcon, colorClass: "text-violet-500", gradientClass: "from-violet-500/20 to-violet-600/5", borderColor: "border-violet-500/20" },
    productivity: { icon: Zap, colorClass: "text-amber-500", gradientClass: "from-amber-500/20 to-amber-600/5", borderColor: "border-amber-500/20" }
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

    // Analytics state
    const [weeklyData, setWeeklyData] = useState<any>(null)
    const [streakData, setStreakData] = useState<any>(null)
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)

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

    const loadAnalytics = async () => {
        try {
            const [weeklyRes, streakRes] = await Promise.all([
                apiClient.analytics.getWeeklyInsights(),
                apiClient.analytics.getStreaks()
            ])
            
            if (weeklyRes.success) {
                setWeeklyData(weeklyRes.data)
            }
            if (streakRes.success) {
                setStreakData(streakRes.data)
            }
        } catch (error) {
            console.error("Failed to load analytics:", error)
        } finally {
            setIsLoadingAnalytics(false)
        }
    }

    useEffect(() => {
        loadSummary()
        loadAnalytics()
    }, [])

    const handleTaskCreated = async () => {
        setIsLoadingStats(true)
        setIsLoadingAnalytics(true)
        await Promise.all([loadSummary(), loadAnalytics()])
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
    const today = new Date()
    const formattedDate = today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
    })
    const formattedYear = today.toLocaleDateString('en-US', { year: 'numeric' })
    const getGreeting = () => {
        const hour = today.getHours()
        if (hour < 12) return 'Good morning'
        if (hour < 18) return 'Good afternoon'
        return 'Good evening'
    }

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
    const [aiError, setAiError] = useState<string | null>(null)

    const executeSuggestion = async (id: string, text: string) => {
        setLoadingId(id)
        setAiError(null)
        try {
            const res = await apiClient.ai.rescheduleTasks(text, todaysTasks)
            if (res.success && res.data) {
                setAiPlanToConfirm(res.data)
                setConfirmingSuggestionId(id)
            } else {
                setAiError("AI processing failed. Please try again.")
            }
        } catch (error) {
            console.error("AI execution failed:", error)
            setAiError(error instanceof Error ? error.message : "AI processing failed. Please try again.")
        } finally {
            setLoadingId(null)
        }
    }

    const handleConfirmAIPlan = async () => {
        if (!aiPlanToConfirm) return
        setIsConfirmingAIPlan(true)
        setAiError(null)
        let executionError = false
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
            setAiError(error instanceof Error ? error.message : "Failed to execute AI plan. Please try again.")
            executionError = true
        } finally {
            setIsConfirmingAIPlan(false)
            setAiPlanToConfirm(null)
            setConfirmingSuggestionId(null)
        }
    }

    const liveStats = [
        { 
            title: "Tasks Completed", 
            value: stats?.tasksCompleted || "0", 
            trend: "+12%", 
            trendUp: true,
            ...STATS_ICONS.tasksCompleted 
        },
        { 
            title: "Focus Time", 
            value: stats?.focusTimeMinutes ? `${Math.round(stats.focusTimeMinutes / 60)}h ${stats.focusTimeMinutes % 60}m` : "0h", 
            trend: "+8%", 
            trendUp: true,
            ...STATS_ICONS.focusTime 
        },
        { 
            title: "Meetings", 
            value: stats?.meetings || "0", 
            trend: "-5%", 
            trendUp: false,
            ...STATS_ICONS.meetings 
        },
        { 
            title: "Productivity", 
            value: "92%", 
            trend: "+15%", 
            trendUp: true,
            ...STATS_ICONS.productivity 
        },
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
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }
    const itemVariant: any = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    }

    return (
        <div className="flex flex-col min-h-full w-full bg-gradient-to-br from-background via-background to-muted/30" data-purpose="dashboard-page">
            {/* Ambient background effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
                <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            </div>

            <div className="relative z-10">
                <div className="max-w-[1600px] mx-auto p-6 lg:p-8">
                        
                        {/* Header Section */}
                        <motion.div 
                            variants={containerVariant}
                            initial="hidden"
                            animate="visible"
                            className="mb-8"
                        >
                            <motion.div variants={itemVariant} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Live</span>
                                        </div>
                                        <span className="text-sm font-medium text-muted-foreground">
                                            {formattedDate}, {formattedYear}
                                        </span>
                                    </div>
                                    <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-2">
                                        {getGreeting()}, {firstName}
                                    </h1>
                                    <p className="text-lg text-muted-foreground max-w-2xl">
                                        Track your productivity, manage your schedule, and achieve your goals with AI-powered insights.
                                    </p>
                                </div>
                                
                                {streakData && (
                                    <motion.div 
                                        variants={itemVariant}
                                        className="flex items-center gap-4"
                                    >
                                        <div className="px-6 py-4 rounded-2xl bg-gradient-to-br from-orange-500/10 via-red-500/10 to-orange-500/5 border border-orange-500/20 backdrop-blur-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-orange-500/20">
                                                    <Flame className="w-5 h-5 text-orange-500" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Current Streak</p>
                                                    <p className="text-2xl font-black text-foreground">{streakData.current_streak} days</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="px-6 py-4 rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-violet-500/5 border border-violet-500/20 backdrop-blur-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-violet-500/20">
                                                    <Award className="w-5 h-5 text-violet-500" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider">Best Streak</p>
                                                    <p className="text-2xl font-black text-foreground">{streakData.longest_streak} days</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        </motion.div>

                        {/* Key Metrics Row */}
                        <motion.div 
                            variants={containerVariant}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                        >
                            {liveStats.map((stat, i) => (
                                <motion.div
                                    variants={itemVariant}
                                    key={i}
                                    className="group relative p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
                                >
                                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", stat.gradientClass)} />
                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={cn("p-3 rounded-xl bg-gradient-to-br from-background to-muted/50 border", stat.borderColor, stat.colorClass)}>
                                                <Icon icon={stat.icon} size="sm" />
                                            </div>
                                            <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold", stat.trendUp ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                                                {stat.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                {stat.trend}
                                            </div>
                                        </div>
                                        <p className="text-sm font-semibold text-muted-foreground mb-1">{stat.title}</p>
                                        <h3 className="text-3xl font-black text-foreground tracking-tight">
                                            {isLoadingStats ? <Skeleton className="h-8 w-20" /> : stat.value}
                                        </h3>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Main Content Grid */}
                        <motion.div 
                            variants={containerVariant}
                            initial="hidden"
                            animate="visible"
                            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                        >
                            
                            {/* Today's Schedule - Spans 7 cols */}
                            <motion.div variants={itemVariant} className="lg:col-span-7 flex flex-col">
                                <div className="flex-1 rounded-3xl bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur-sm overflow-hidden">
                                    <div className="p-6 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                                                    <CalendarIcon className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-foreground">Today's Schedule</h2>
                                                    <p className="text-sm text-muted-foreground">{todaysTasks.length} tasks scheduled</p>
                                                </div>
                                            </div>
                                            <button className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors border border-border/50">
                                                <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col gap-3 max-h-[600px] overflow-y-auto">
                                        {summaryError ? (
                                            <div className="flex-1 flex items-center justify-center p-8 text-destructive font-medium border border-dashed border-destructive/30 bg-destructive/10 rounded-2xl">
                                                {summaryError}
                                            </div>
                                        ) : isLoadingStats ? (
                                            <div className="space-y-3">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-muted/30">
                                                        <Skeleton className="h-12 w-12 rounded-xl" />
                                                        <div className="flex-1 space-y-2">
                                                            <Skeleton className="h-4 w-3/4" />
                                                            <Skeleton className="h-3 w-1/2" />
                                                        </div>
                                                        <Skeleton className="h-8 w-20 rounded-xl" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : todaysTasks.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground border border-dashed border-border/50 rounded-2xl bg-muted/10">
                                                <div className="p-4 rounded-2xl bg-muted/20 mb-4">
                                                    <CheckCircle2 className="w-8 h-8 text-muted-foreground/30" />
                                                </div>
                                                <p className="font-semibold text-lg mb-1">No tasks scheduled</p>
                                                <p className="text-sm">Enjoy your free time or add a new task to get started</p>
                                            </div>
                                        ) : (
                                            todaysTasks.map((item, i) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => setEditTask(item)}
                                                    className={cn(
                                                        "group flex items-center gap-4 p-4 rounded-2xl border bg-gradient-to-r from-card to-card/50 hover:from-muted/50 hover:to-muted/30 transition-all duration-200 cursor-pointer",
                                                        i === focusedIndex ? "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10" : "border-border/50 hover:border-border"
                                                    )}
                                                >
                                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 flex items-center justify-center group-hover:from-primary/10 group-hover:to-primary/5 group-hover:border-primary/20 transition-all">
                                                        <Icon icon={item.external_provider === 'zoom' ? Video : item.external_provider === 'gmail' ? Mail : CheckCircle2} size="sm" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">{item.title}</p>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <span className="text-xs font-semibold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg capitalize border border-border/30">
                                                                {item.category || 'General'}
                                                            </span>
                                                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {item.estimated_duration_minutes} mins
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                        <div className="px-3 py-1.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                                                            <span className="text-sm font-bold text-primary">
                                                                {item.scheduled_at ? new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No time'}
                                                            </span>
                                                        </div>
                                                        {item.recurrence_rule && (
                                                            <div className="flex items-center text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20">
                                                                <Repeat className="w-3 h-3 mr-1" />
                                                                Recurring
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Right Sidebar - Spans 5 cols */}
                            <div className="lg:col-span-5 flex flex-col gap-6">
                                
                                {/* Weekly Analytics Card */}
                                <motion.div variants={itemVariant} className="rounded-3xl bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur-sm overflow-hidden">
                                    <div className="p-6 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 border border-cyan-500/20">
                                                    <BarChart3 className="w-5 h-5 text-cyan-500" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-foreground">Weekly Overview</h2>
                                                    <p className="text-sm text-muted-foreground">Last 7 days</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <div className="h-48">
                                            <WeeklyChart data={weeklyData?.weekly_tasks} />
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Task Breakdown & AI Copilot Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                                    
                                    {/* Task Breakdown */}
                                    <motion.div variants={itemVariant} className="rounded-3xl bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur-sm overflow-hidden">
                                        <div className="p-6 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/20">
                                                    <Target className="w-5 h-5 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-foreground">Task Status</h2>
                                                    <p className="text-sm text-muted-foreground">{todaysTasks.length} total</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col items-center justify-center min-h-[260px] relative">
                                            <TaskBreakdownChart
                                                pieData={pieData}
                                                total={todaysTasks.length}
                                            />
                                        </div>
                                    </motion.div>

                                    {/* AI Copilot */}
                                    <motion.div variants={itemVariant} className="rounded-3xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 backdrop-blur-sm overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-6 opacity-5">
                                            <Sparkles className="w-32 h-32 text-primary" />
                                        </div>
                                        <div className="p-6 border-b border-primary/10 bg-gradient-to-r from-primary/10 to-transparent">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/30 to-primary/20 border border-primary/30">
                                                    <Sparkles className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-foreground">AI Copilot</h2>
                                                    <p className="text-sm text-muted-foreground">Smart suggestions</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-6 relative z-10">
                                            <div className="space-y-3">
                                                {visibleSuggestions.length === 0 ? (
                                                    <div className="p-6 text-center bg-card/50 rounded-2xl text-sm font-medium text-muted-foreground border border-border/50">
                                                        <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                                                        No new suggestions
                                                    </div>
                                                ) : (
                                                    visibleSuggestions.map((s) => (
                                                        <div
                                                            key={s.id}
                                                            className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm"
                                                        >
                                                            <p className="text-sm text-foreground font-medium mb-3 leading-relaxed">
                                                                {s.text}
                                                            </p>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => executeSuggestion(s.id, s.text)}
                                                                    disabled={loadingId === s.id}
                                                                    className="flex-1 py-2 text-xs font-bold bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl hover:from-primary/90 hover:to-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {loadingId === s.id ? (
                                                                        <span className="flex items-center justify-center gap-2">
                                                                            <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                                                            Working...
                                                                        </span>
                                                                    ) : s.action}
                                                                </button>
                                                                <button
                                                                    onClick={() => dismissSuggestion(s.id)}
                                                                    className="px-4 py-2 text-xs font-bold bg-transparent text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors"
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
                    setAiError(null)
                }}
            />

            {/* AI Error Toast */}
            <AnimatePresence>
                {aiError && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 right-6 z-[200] max-w-md"
                    >
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 shadow-lg">
                            <AlertCircle size={20} />
                            <span className="flex-1 text-sm font-medium">{aiError}</span>
                            <button
                                onClick={() => setAiError(null)}
                                className="text-red-500/60 hover:text-red-500"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
