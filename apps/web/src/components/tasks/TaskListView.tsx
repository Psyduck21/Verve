"use client"

import { format } from "date-fns"
import { Calendar, CheckCircle2, MoreHorizontal } from "lucide-react"
import { Icon } from "@/components/ui/Icon"
import type { Task } from "@/hooks/useTasks"
import { cn } from "@/lib/utils"

interface TaskListViewProps {
    tasks: Task[]
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

export function TaskListView({ tasks }: TaskListViewProps) {
    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-card rounded-2xl border border-dashed border-border py-12">
                <span className="material-symbols-outlined text-4xl mb-4 opacity-50">search_off</span>
                <p className="font-bold">No tasks found</p>
                <p className="text-sm opacity-80">Try adjusting your search or filters.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            {tasks.map((task) => (
                <div 
                    key={task.id}
                    className="group flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:shadow-md transition-all cursor-default"
                >
                    <div className="flex items-center gap-4 flex-1">
                        <button className={cn("shrink-0 transition-all outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-full", task.status === "completed" ? "text-status-done" : "text-muted-foreground hover:text-primary")}>
                            <Icon icon={CheckCircle2} size="md" />
                        </button>
                        <div className="flex flex-col gap-1">
                            <h4 className={cn("text-sm font-bold text-foreground", task.status === "completed" && "line-through text-muted-foreground opacity-80")}>
                                {task.title}
                            </h4>
                            {task.scheduled_at && (
                                <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                                    <Icon icon={Calendar} size="sm" className="w-3 h-3 opacity-70" />
                                    {format(new Date(task.scheduled_at), "MMM d, yyyy h:mm a")}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-2">
                            {task.category && (
                                <span className={cn("px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md", CATEGORY_COLORS[task.category as keyof typeof CATEGORY_COLORS] || "bg-muted text-muted-foreground")}>
                                    {task.category}
                                </span>
                            )}
                            <span className={cn("px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md", PRIORITY_COLORS[task.priority || 'low'])}>
                                {task.priority || 'low'}
                            </span>
                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-muted text-muted-foreground">
                                {task.status.replace('_', ' ')}
                            </span>
                        </div>
                        <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-muted">
                            <Icon icon={MoreHorizontal} size="sm" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}
