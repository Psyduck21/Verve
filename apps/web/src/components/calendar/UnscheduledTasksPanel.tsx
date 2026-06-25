"use client"

import { useTasks } from "@/hooks/useTasks"
import { Icon } from "@/components/ui/Icon"
import { GripVertical, Clock, AlertCircle } from "lucide-react"

// Module-level variable to hold the dragged task payload for react-big-calendar
export let draggedTaskPayload: any = null

export function UnscheduledTasksPanel({ isOpen, onTaskClick }: { isOpen: boolean, onTaskClick?: (task: any) => void }) {
    const { data: tasks, isLoading } = useTasks()

    // Filter tasks that do not have a scheduled_at date
    const unscheduledTasks = tasks?.filter(t => !t.scheduled_at) || []

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, task: any) => {
        // Provide the task data to the drop zone
        e.dataTransfer.setData("text/plain", JSON.stringify(task))
        e.dataTransfer.effectAllowed = "move"
        draggedTaskPayload = task
    }

    return (
        <div 
            className={`flex flex-col h-full shrink-0 bg-card border-border rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? 'w-80 opacity-100 border ml-6' : 'w-0 opacity-0 border-none ml-0'
            }`} 
            data-purpose="unscheduled-tasks-panel"
        >
            <div className="w-80 flex flex-col h-full">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <AlertCircle size={16} className="text-primary" />
                    Unscheduled Tasks
                </h2>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                    Drag and drop onto the calendar to schedule
                </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {isLoading ? (
                    <div className="text-sm text-muted-foreground text-center py-8">Loading tasks...</div>
                ) : unscheduledTasks.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">All tasks are scheduled! 🎉</div>
                ) : (
                    unscheduledTasks.map(task => (
                        <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            onClick={() => onTaskClick?.(task)}
                            className="group flex flex-col gap-1 p-3 bg-background border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer active:cursor-grabbing"
                        >
                            <div className="flex items-start gap-2">
                                <Icon icon={GripVertical} size="sm" className="text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate">{task.title}</p>
                                    {task.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{task.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pl-6 mt-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                                    <Clock size={10} />
                                    {task.estimated_duration_minutes || 30}m
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-[10px] font-bold text-primary capitalize">
                                    {task.priority || "Medium"}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
            </div>
        </div>
    )
}
