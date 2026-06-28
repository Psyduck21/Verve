"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CheckCircle2 } from "lucide-react"
import { TaskCard } from "./TaskCard"
import type { Task } from "@/hooks/useTasks"
import type { Routine } from "@/hooks/useRoutines"
import { cn } from "@/lib/utils"

interface Subtask {
    id: string
    title: string
    status: "not_started" | "in_progress" | "completed" | "missed" | "cancelled"
    priority: "critical" | "high" | "medium" | "low"
    estimated_duration_minutes: number
    order_index: number
}

interface TaskColumnProps {
    id: string
    title: string
    tasks?: Task[]
    groupedTasks?: Array<{ routine: Routine | null; tasks: Task[] }>
    focusedTaskId?: string | null
    selectedTaskIds?: Set<string>
    subtasksByTaskId?: Record<string, Subtask[]>
    expandedSubtaskIds?: Set<string>
    onTaskClick?: (task: Task) => void
    onSubtaskClick?: (taskId: string, subtask: Subtask) => void
    onToggleSubtask?: (taskId: string, subtaskId: string) => void
    onDeleteSubtask?: (taskId: string, subtaskId: string) => void
}

export function TaskColumn({
    id,
    title,
    tasks,
    groupedTasks,
    focusedTaskId,
    selectedTaskIds,
    subtasksByTaskId,
    expandedSubtaskIds,
    onTaskClick,
    onSubtaskClick,
    onToggleSubtask,
    onDeleteSubtask,
}: TaskColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id,
    })

    const taskGroups = groupedTasks || (tasks ? [{ routine: null, tasks }] : [])
    const totalTaskCount = taskGroups.reduce((sum, group) => sum + group.tasks.length, 0)

    const getSubtasksForTask = (taskId: string) => subtasksByTaskId?.[taskId] || []

    return (
        <div className="flex flex-col min-w-[280px] flex-1">
            {/* Column Header */}
            <div className={cn(
                "flex items-center justify-between h-8 mb-4 px-3 rounded-lg bg-muted/50 border border-border/50",
                id === "missed" && "bg-destructive/10 border-destructive/20",
                id === "completed" && "bg-[hsl(var(--status-done)/0.1)] border-[hsl(var(--status-done)/0.2)]"
            )}>
                <h3 className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    id === "missed" ? "text-destructive" : id === "completed" ? "text-[hsl(var(--status-done))]" : "text-foreground"
                )}>
                    {title}
                </h3>
                <span className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold",
                    id === "missed" ? "bg-destructive/15 text-destructive" : id === "completed" ? "bg-[hsl(var(--status-done)/0.15)] text-[hsl(var(--status-done))]" : "bg-muted text-muted-foreground"
                )}>
                    {totalTaskCount}
                </span>
            </div>

            {/* Droppable Area */}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 flex flex-col gap-4 min-h-[150px] p-1 rounded-xl transition-colors",
                    isOver ? "bg-muted/50" : "bg-transparent"
                )}
            >
                {taskGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="flex flex-col gap-3">
                        {group.routine && (
                            <div className="px-3 py-2 bg-primary/5 border border-primary/10 rounded-lg">
                                <span className="text-xs font-semibold text-primary">{group.routine.title}</span>
                            </div>
                        )}
                        <SortableContext 
                            items={group.tasks.map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {group.tasks.map(task => {
                                const isTaskFocused = task.id === focusedTaskId
                                const hasExpandedSubtasks = expandedSubtaskIds?.has(task.id)
                                const subtasks = hasExpandedSubtasks ? getSubtasksForTask(task.id) : []

                                return (
                                    <div key={task.id} className="space-y-3">
                                        <TaskCard
                                            task={task}
                                            isFocused={isTaskFocused}
                                            isSelected={selectedTaskIds?.has(task.id)}
                                            onClick={() => onTaskClick?.(task)}
                                        />

                                        {hasExpandedSubtasks && subtasks.length > 0 && (
                                            <div className="space-y-2 pl-4">
                                                {subtasks.map(subtask => {
                                                    const isSubtaskFocused = subtask.id === focusedTaskId
                                                    const isSubtaskSelected = selectedTaskIds?.has(subtask.id)

                                                    return (
                                                        <div
                                                            key={subtask.id}
                                                            className={cn(
                                                                "flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 text-sm",
                                                                isSubtaskFocused && "ring-2 ring-primary",
                                                                isSubtaskSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                                            )}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => onSubtaskClick?.(task.id, subtask)}
                                                                className="text-left flex-1 flex items-center gap-3"
                                                            >
                                                                <span className={cn(
                                                                    "inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-[10px] font-bold",
                                                                    subtask.status === "completed" ? "bg-[hsl(var(--status-done)/0.15)] text-[hsl(var(--status-done))]" : "bg-muted text-muted-foreground"
                                                                )}>
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                </span>
                                                                <span className={cn(
                                                                    "truncate",
                                                                    subtask.status === "completed" && "line-through text-muted-foreground"
                                                                )}>
                                                                    {subtask.title}
                                                                </span>
                                                            </button>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onToggleSubtask?.(task.id, subtask.id)}
                                                                    className="text-xs text-muted-foreground hover:text-foreground"
                                                                >
                                                                    Toggle
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onDeleteSubtask?.(task.id, subtask.id)}
                                                                    className="text-xs text-destructive hover:text-destructive/80"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </SortableContext>
                    </div>
                ))}
            </div>
        </div>
    )
}
