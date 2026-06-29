"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { Calendar, AlignLeft, GripVertical, CheckCircle2, MoreHorizontal, ListTodo, Check, Lock } from "lucide-react"
import { Icon } from "@/components/ui/Icon"
import type { Task } from "@/hooks/useTasks"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"
import { useRoutines } from "@/hooks/useRoutines"

interface TaskCardProps {
    task: Task
    isOverlay?: boolean
    isFocused?: boolean
    isSelected?: boolean
    onClick?: () => void
}

const PRIORITY_COLORS = {
    critical: "bg-destructive/10 text-destructive border-destructive/20",
    high:     "bg-status-review/10 text-status-review border-status-review/20",
    medium:   "bg-status-progress/10 text-status-progress border-status-progress/20",
    low:      "bg-muted text-muted-foreground border-border",
}

const CATEGORY_COLORS = {
    work:     "bg-tag-work-bg text-tag-work-text",
    personal: "bg-tag-personal-bg text-tag-personal-text",
    health:   "bg-tag-health-bg text-tag-health-text",
    learning: "bg-tag-learning-bg text-tag-learning-text",
}

const PRIORITY_BORDER_COLORS = {
    critical: "border-l-destructive",
    high:     "border-l-status-review",
    medium:   "border-l-status-progress",
    low:      "border-l-muted-foreground",
}

const CATEGORY_BG_COLORS = {
    work:     "bg-tag-work-bg",
    personal: "bg-tag-personal-bg",
    health:   "bg-tag-health-bg",
    learning: "bg-tag-learning-bg",
}


export function TaskCard({ task, isOverlay, isFocused, isSelected, onClick }: TaskCardProps) {
    const { data: routines = [] } = useRoutines()
    const routine = routines.find(r => r.id === task.routine_id)

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    }

    // Fetch subtasks for this task (with staleTime to avoid excessive requests)
    const { data: subtasksResponse } = useQuery({
        queryKey: ['subtasks', task.id],
        queryFn: () => apiClient.subtasks.list(task.id).then(r => r.data || []),
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: !isOverlay,
    })
    const subtasks = subtasksResponse || []
    const subtaskTotal = subtasks.length
    const subtaskDone = subtasks.filter((s: any) => s.status === 'completed').length
    const subtaskProgress = subtaskTotal > 0 ? (subtaskDone / subtaskTotal) * 100 : 0

    return (
        <motion.div
            layout
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -1 }}
            onClick={onClick}
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative border-y border-r border-l-[5px] p-5 rounded-2xl flex flex-col gap-3 shadow-none hover:shadow-md transition-all cursor-default outline-none",
                "bg-card",
                task.priority && PRIORITY_BORDER_COLORS[task.priority as keyof typeof PRIORITY_BORDER_COLORS] ? PRIORITY_BORDER_COLORS[task.priority as keyof typeof PRIORITY_BORDER_COLORS] : "border-l-border",
                "border-y-border border-r-border",
                isOverlay && "shadow-[0_12px_24px_rgba(0,0,0,0.1)] scale-105 rotate-2 cursor-grabbing z-50",
                task.status === "completed" && "opacity-50 grayscale",
                isFocused && "shadow-2xl scale-[1.04] z-50 !border-l-[4.8px]",
                isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
        >
            {/* Drag Handle & Top Row */}
            <div className="flex items-center justify-between gap-2">
                {/* Focus indicator */}
                {isFocused && (
                    <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-primary shadow-lg" />
                )}
                {/* Selection Checkbox */}
                {isSelected && (
                    <div className="p-1 text-primary">
                        <Icon icon={Check} size="sm" className="w-4 h-4" />
                    </div>
                )}
                
                <div 
                    {...attributes} 
                    {...listeners} 
                    className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing rounded"
                    tabIndex={-1}
                >
                    <Icon icon={GripVertical} size="sm" className="w-4 h-4" />
                </div>
                
                <div className="flex-1 flex flex-wrap gap-2 items-center">
                    {/* Priority Badge */}
                    <span className={cn("px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md", PRIORITY_COLORS[task.priority])}>
                        {task.priority}
                    </span>
                    
                    {/* Routine Badge */}
                    {routine && (
                        <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-primary/10 text-primary border border-primary/20">
                            {routine.title}
                        </span>
                    )}
                    
                    {/* Category Badge */}
                    {task.category && (
                        <span className={cn("px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md", CATEGORY_COLORS[task.category as keyof typeof CATEGORY_COLORS] || "bg-muted text-muted-foreground")}>
                            {task.category}
                        </span>
                    )}
                    
                    {/* Time Locked Badge */}
                    {task.is_time_locked && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                            <Icon icon={Lock} size="sm" className="w-3 h-3" />
                            Locked
                        </span>
                    )}
                </div>

                <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 outline-none focus-visible:ring-1 focus-visible:ring-primary rounded">
                    <Icon icon={MoreHorizontal} size="sm" className="w-4 h-4" />
                </button>
            </div>

            {/* Title */}
            <div className="flex items-start gap-2 pl-5 pr-2">
                <button className={cn("mt-[2px] shrink-0 transition-all outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-full", task.status === "completed" ? "text-status-done scale-110 shadow-[0_0_8px_hsl(var(--status-done)/0.4)]" : "text-muted-foreground hover:text-primary")}>
                    <Icon icon={CheckCircle2} size="sm" className="w-3.5 h-3.5" />
                </button>
                <h4 className={cn("text-[13px] font-bold leading-snug text-foreground", task.status === "completed" && "line-through text-muted-foreground")}>
                    {task.title}
                </h4>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between pl-5 mt-0.5">
                {task.scheduled_at ? (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                        <Icon icon={Calendar} size="sm" className="w-3 h-3 opacity-70" />
                        {format(new Date(task.scheduled_at), "MMM d, h:mm a")}
                    </div>
                ) : (
                    <div />
                )}

                {/* Subtask Progress */}
                {subtaskTotal > 0 && (
                    <div className="flex items-center gap-1.5">
                        <Icon icon={ListTodo} size="sm" className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground">{subtaskDone}/{subtaskTotal}</span>
                        <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${subtaskProgress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
