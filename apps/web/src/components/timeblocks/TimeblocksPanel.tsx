"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Pencil, Trash2, X, Clock, CheckCircle2 } from "lucide-react"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { useTimeblocks, useCreateTimeblock, useUpdateTimeblock, useDeleteTimeblock, useConvertTimeblockToTask } from "@/hooks/useTimeblocks"
import type { TimeBlock } from "@/hooks/useTimeblocks"

interface TimeblocksPanelProps {
    className?: string
    selectedDate?: Date
}

const TIMEBLOCK_COLORS = [
    "#ef4444", // red
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#8b5cf6", // violet
    "#ec4899", // pink
]

export function TimeblocksPanel({ className, selectedDate }: TimeblocksPanelProps) {
    const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    const { data: timeblocks = [] } = useTimeblocks({ start_date: dateStr, end_date: dateStr })
    const createTimeblock = useCreateTimeblock()
    const updateTimeblock = useUpdateTimeblock()
    const deleteTimeblock = useDeleteTimeblock()
    const convertToTask = useConvertTimeblockToTask()

    const [isCreating, setIsCreating] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [newTitle, setNewTitle] = useState("")
    const [newStartTime, setNewStartTime] = useState("09:00")
    const [newEndTime, setNewEndTime] = useState("10:00")
    const [newColor, setNewColor] = useState(TIMEBLOCK_COLORS[1])
    const [editTitle, setEditTitle] = useState("")
    const [editStartTime, setEditStartTime] = useState("")
    const [editEndTime, setEditEndTime] = useState("")
    const [editColor, setEditColor] = useState("")

    const handleCreate = () => {
        if (!newTitle.trim()) return
        const startDateTime = new Date(`${dateStr}T${newStartTime}:00`).toISOString()
        const endDateTime = new Date(`${dateStr}T${newEndTime}:00`).toISOString()
        
        createTimeblock.mutate(
            { 
                label: newTitle, 
                start_time: startDateTime, 
                end_time: endDateTime, 
                color: newColor 
            },
            {
                onSuccess: () => {
                    setNewTitle("")
                    setNewStartTime("09:00")
                    setNewEndTime("10:00")
                    setNewColor(TIMEBLOCK_COLORS[1])
                    setIsCreating(false)
                    toast({ title: "Time block created" })
                },
                onError: (err: any) => {
                    toast({ title: "Unable to create time block", description: err.message || "Please try again." })
                }
            }
        )
    }

    const handleUpdate = (timeblock: TimeBlock) => {
        if (!editTitle.trim()) return
        const startDateTime = editStartTime ? new Date(`${dateStr}T${editStartTime}:00`).toISOString() : timeblock.start_time
        const endDateTime = editEndTime ? new Date(`${dateStr}T${editEndTime}:00`).toISOString() : timeblock.end_time
        
        updateTimeblock.mutate(
            { 
                id: timeblock.id, 
                label: editTitle, 
                start_time: startDateTime, 
                end_time: endDateTime, 
                color: editColor || timeblock.color 
            },
            {
                onSuccess: () => {
                    setEditingId(null)
                    setEditTitle("")
                    setEditStartTime("")
                    setEditEndTime("")
                    setEditColor("")
                    toast({ title: "Time block updated" })
                },
                onError: (err: any) => {
                    toast({ title: "Unable to update time block", description: err.message || "Please try again." })
                }
            }
        )
    }

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this timeblock?")) {
            deleteTimeblock.mutate(id)
        }
    }

    const handleConvertToTask = (id: string) => {
        convertToTask.mutate(id)
    }

    useEffect(() => {
        const handleOpenTimeblockModal = () => setIsCreating(true)
        const handleCreateTimeblockDirectly = () => {
            setIsCreating(true)
            // Optional: Focus on the title input if needed
            setTimeout(() => {
                const titleInput = document.querySelector('input[placeholder*="Title"]') as HTMLInputElement
                if (titleInput) titleInput.focus()
            }, 0)
        }
        
        window.addEventListener("open_timeblock_modal", handleOpenTimeblockModal)
        window.addEventListener("create_timeblock_directly", handleCreateTimeblockDirectly)
        
        return () => {
            window.removeEventListener("open_timeblock_modal", handleOpenTimeblockModal)
            window.removeEventListener("create_timeblock_directly", handleCreateTimeblockDirectly)
        }
    }, [])

    const formatTime = (timeStr: string) => {
        return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className={cn("flex flex-col h-full bg-card border-r border-border", className)}>
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Icon icon={Clock} size="sm" className="text-primary" />
                        Time Blocks
                    </h2>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                        <Icon icon={Plus} size="sm" />
                    </button>
                </div>

                {/* Create Input */}
                <AnimatePresence>
                    {isCreating && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2"
                        >
                            <input
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Time block name..."
                                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreate()
                                    if (e.key === "Escape") {
                                        setIsCreating(false)
                                        setNewTitle("")
                                    }
                                }}
                            />
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                                    <input
                                        type="time"
                                        value={newStartTime}
                                        onChange={(e) => setNewStartTime(e.target.value)}
                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-muted-foreground mb-1 block">End</label>
                                    <input
                                        type="time"
                                        value={newEndTime}
                                        onChange={(e) => setNewEndTime(e.target.value)}
                                        className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-1 flex-wrap">
                                {TIMEBLOCK_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setNewColor(color)}
                                        className={cn(
                                            "w-6 h-6 rounded-full border-2 transition-all",
                                            newColor === color ? "border-foreground scale-110" : "border-transparent"
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreate}
                                    className="flex-1 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    Create
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreating(false)
                                        setNewTitle("")
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                                >
                                    <Icon icon={X} size="sm" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Timeblocks List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {timeblocks.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        No time blocks for this day.<br />
                        Click + to create one.
                    </div>
                ) : (
                    timeblocks
                        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                        .map((timeblock) => (
                        <motion.div
                            key={timeblock.id}
                            layout
                            className={cn(
                                "group relative p-3 rounded-xl border transition-all",
                                timeblock.color ? `bg-[${timeblock.color}]/10 border-[${timeblock.color}]/20` : "bg-muted/30 border-border"
                            )}
                        >
                            {editingId === timeblock.id ? (
                                // Edit Mode
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="Time block name..."
                                        className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <input
                                                type="time"
                                                value={editStartTime}
                                                onChange={(e) => setEditStartTime(e.target.value)}
                                                className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="time"
                                                value={editEndTime}
                                                onChange={(e) => setEditEndTime(e.target.value)}
                                                className="w-full px-2 py-1 text-sm bg-background border border-border rounded-lg"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-1 flex-wrap">
                                        {TIMEBLOCK_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => setEditColor(color)}
                                                className={cn(
                                                    "w-6 h-6 rounded-full border-2 transition-all",
                                                    editColor === color ? "border-foreground scale-110" : "border-transparent"
                                                )}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleUpdate(timeblock)}
                                            className="flex-1 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingId(null)
                                                setEditTitle("")
                                                setEditStartTime("")
                                                setEditEndTime("")
                                                setEditColor("")
                                            }}
                                            className="px-2 py-1 text-xs font-bold bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                                        >
                                            <Icon icon={X} size="sm" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // View Mode
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: timeblock.color || '#3b82f6' }}
                                            />
                                            <span className="text-sm font-medium text-foreground">
                                                {timeblock.label || 'Untitled time block'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {formatTime(timeblock.start_time)} - {formatTime(timeblock.end_time)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleConvertToTask(timeblock.id)}
                                            className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                            title="Convert to task"
                                        >
                                            <Icon icon={CheckCircle2} size="sm" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingId(timeblock.id)
                                                setEditTitle(timeblock.label || "")
                                                setEditStartTime(new Date(timeblock.start_time).toTimeString().slice(0, 5))
                                                setEditEndTime(new Date(timeblock.end_time).toTimeString().slice(0, 5))
                                                setEditColor(timeblock.color || "")
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                                        >
                                            <Icon icon={Pencil} size="sm" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(timeblock.id)}
                                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                        >
                                            <Icon icon={Trash2} size="sm" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    )
}
