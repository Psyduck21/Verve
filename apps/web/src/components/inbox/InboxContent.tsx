"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Video, CheckCircle2, Search, Filter } from "lucide-react"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"
import { useTasks } from "@/hooks/useTasks"
import { EditTaskModal } from "@/components/tasks/EditTaskModal"

export function InboxContent({ user }: { user?: any }) {
    const [inboxTab, setInboxTab] = useState("all")
    const [editTask, setEditTask] = useState<any | null>(null)
    const [focusedIndex, setFocusedIndex] = useState(-1)
    const { data: tasks = [] } = useTasks()

    const sortedTasks = useMemo(() => {
        const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 }

        let filtered = tasks
        if (inboxTab === "emails") filtered = tasks.filter(t => t.external_provider === 'gmail' || t.external_provider === 'outlook')
        if (inboxTab === "meetings") filtered = tasks.filter(t => t.external_provider === 'zoom' || t.external_provider === 'google_calendar')

        return [...filtered].sort((a, b) => {
            const dA = new Date(a.scheduled_at)
            const dB = new Date(b.scheduled_at)

            // Compare by Day
            const dayA = new Date(dA.getFullYear(), dA.getMonth(), dA.getDate()).getTime()
            const dayB = new Date(dB.getFullYear(), dB.getMonth(), dB.getDate()).getTime()

            if (dayA !== dayB) return dayA - dayB

            // Compare by Priority within the same day
            const pA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0
            const pB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0
            if (pA !== pB) return pB - pA

            // Fallback: compare exact time
            return dA.getTime() - dB.getTime()
        })
    }, [tasks, inboxTab])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (editTask) return;
            if (sortedTasks.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setFocusedIndex(prev => (prev < sortedTasks.length - 1 ? prev + 1 : prev))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev))
            } else if ((e.key === 'Enter' || e.key === 'e') && focusedIndex >= 0) {
                e.preventDefault()
                setEditTask(sortedTasks[focusedIndex])
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [sortedTasks, focusedIndex, editTask])

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'text-red-500 bg-red-500/10'
            case 'high': return 'text-orange-500 bg-orange-500/10'
            case 'medium': return 'text-blue-500 bg-blue-500/10'
            default: return 'text-muted-foreground bg-muted'
        }
    }

    return (
        <div className="flex flex-col h-full w-full bg-transparent">
            <div className="flex-1 bg-card rounded-tl-[32px] border-t border-border flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
                        <div className="flex gap-2 bg-muted p-1 rounded-xl">
                            {["all", "emails", "meetings"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setInboxTab(tab)}
                                    className={cn(
                                        "px-4 py-2 text-sm font-bold rounded-lg transition-colors",
                                        inboxTab === tab
                                            ? "bg-white text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                            {sortedTasks.length === 0 ? (
                                <div
                                    className="p-12 text-center text-muted-foreground font-medium border border-dashed border-border bg-background rounded-2xl"
                                >
                                    Inbox Zero! You're all caught up.
                                </div>
                            ) : (
                                sortedTasks.map((item, i) => (
                                    <div
                                        key={item.id}
                                        onClick={() => setEditTask(item)}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-2xl border bg-white dark:bg-white/5 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 group cursor-pointer",
                                            i === focusedIndex ? "border-primary ring-2 ring-primary/20" : "border-border"
                                        )}
                                    >
                                        <div className="p-3 rounded-xl bg-white text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-border">
                                            <Icon icon={item.external_provider === 'zoom' ? Video : item.external_provider === 'gmail' ? Mail : CheckCircle2} size="md" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-bold text-foreground truncate">{item.title}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-xs font-medium text-muted-foreground capitalize">{item.external_provider || item.category || 'Task'}</p>
                                                {item.priority && (
                                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase", getPriorityColor(item.priority))}>
                                                        {item.priority}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-sm font-bold text-muted-foreground whitespace-nowrap text-right">
                                            <div>{new Date(item.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                                            <div className="text-xs">{new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                    </div>
                                ))
                            )}
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
