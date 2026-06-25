"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { TaskCard } from "./TaskCard"
import type { Task } from "@/hooks/useTasks"
import { cn } from "@/lib/utils"

interface TaskColumnProps {
    id: string
    title: string
    tasks: Task[]
    focusedTaskId?: string | null
    onTaskClick?: (task: Task) => void
}

export function TaskColumn({ id, title, tasks, focusedTaskId, onTaskClick }: TaskColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id,
    })

    return (
        <div className="flex flex-col min-w-[280px] flex-1">
            {/* Column Header */}
            <div className={cn(
                "flex items-center justify-between h-8 mb-4 px-3 rounded-lg bg-muted/50 border border-border/50",
                id === "missed" && "bg-red-50 border-red-100",
                id === "completed" && "bg-green-50 border-green-100"
            )}>
                <h3 className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    id === "missed" ? "text-red-700" : id === "completed" ? "text-green-700" : "text-foreground"
                )}>
                    {title}
                </h3>
                <span className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold",
                    id === "missed" ? "bg-red-100 text-red-700" : id === "completed" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                )}>
                    {tasks.length}
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
                <SortableContext 
                    items={tasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {tasks.map(task => (
                        <TaskCard key={task.id} task={task} isFocused={task.id === focusedTaskId} onClick={() => onTaskClick?.(task)} />
                    ))}
                </SortableContext>
            </div>
        </div>
    )
}
