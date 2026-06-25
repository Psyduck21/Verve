"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Type, AlignLeft, AlertCircle, Tag, Clock, CornerDownLeft, Save, X, ArrowUp, ArrowDown, Calendar } from "lucide-react"
import { format } from "date-fns"
import { useUpdateTask } from "@/hooks/useTasks"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTasks } from "@/hooks/useTasks"
import { useFocusTrap } from "@/hooks/useFocusTrap"
import { KEYBINDINGS } from "@/config/keybindings"
import { isHotkey } from "@/utils/keyboard"
import { apiClient } from "@/utils/apiClient"
import { SubtaskList } from "@/components/tasks/SubtaskList"

interface EditTaskModalProps {
    open: boolean
    onClose: () => void
    task: any | null
}

const PRIORITIES = ["critical", "high", "medium", "low"]
const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240, 480]

const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`
    const hours = mins / 60
    return `${hours}h`
}

export function EditTaskModal({ open, onClose, task }: EditTaskModalProps) {
    const [focusedFieldIdx, setFocusedFieldIdx] = useState(0)
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState<string>("")
    const [dropdownFocusIdx, setDropdownFocusIdx] = useState(0)
    
    const [editedTask, setEditedTask] = useState<any>(null)
    const { mutate: updateTask, isPending } = useUpdateTask()
    const queryClient = useQueryClient()

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: apiClient.categories.getCategories,
        enabled: open
    })

    // Subtask state
    const { data: subtasksData, refetch: refetchSubtasks } = useQuery({
        queryKey: ['subtasks', task?.id],
        queryFn: () => apiClient.subtasks.list(task!.id).then(r => r.data || []),
        enabled: open && !!task?.id,
    })
    const subtasks = subtasksData || []
    
    const displayCategories = categories.length > 0 ? categories : [
        {name: 'work', color: '#ef4444'},
        {name: 'personal', color: '#3b82f6'},
        {name: 'health', color: '#10b981'}
    ]

    const inputRef = useRef<HTMLInputElement>(null)
    const modalRef = useFocusTrap(open)

    useEffect(() => {
        if (open && task) {
            setEditedTask({ ...task })
            setFocusedFieldIdx(0)
            setIsEditing(false)
            setTimeout(() => modalRef.current?.focus(), 50)
        }
    }, [open, task])

    useEffect(() => {
        if (isEditing) {
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isEditing])

    const fields = [
        { id: 'title', label: 'Title', icon: Type, value: editedTask?.title || '' },
        { id: 'description', label: 'Description', icon: AlignLeft, value: editedTask?.description || 'No description' },
        { id: 'priority', label: 'Priority', icon: AlertCircle, value: editedTask?.priority || 'medium' },
        { id: 'category', label: 'Category', icon: Tag, value: editedTask?.category || 'personal' },
        { id: 'scheduled_at', label: 'Start Time', icon: Calendar, value: editedTask?.scheduled_at ? format(new Date(editedTask.scheduled_at), "MMM d, yyyy h:mm a") : 'Not scheduled' },
        { id: 'duration', label: 'Duration', icon: Clock, value: formatDuration(editedTask?.estimated_duration_minutes || 30) },
    ]

    const currentField = fields[focusedFieldIdx]

    let currentOptions: any[] = []
    if (currentField?.id === 'priority') currentOptions = PRIORITIES
    else if (currentField?.id === 'category') currentOptions = displayCategories.map((c: any) => c.name)
    else if (currentField?.id === 'duration') currentOptions = DURATIONS.map(d => d.toString())

    const filteredOptions = currentOptions.filter(o => o.toLowerCase().includes(editValue.toLowerCase()))
    const safeDropdownFocusIdx = Math.min(dropdownFocusIdx, Math.max(0, filteredOptions.length - 1))

    const saveOption = (opt: string) => {
        setEditValue(opt)
        setTimeout(() => {
            setEditedTask((prev: any) => ({ 
                ...prev, 
                [currentField.id === 'duration' ? 'estimated_duration_minutes' : currentField.id]: 
                    currentField.id === 'duration' ? parseInt(opt) : opt 
            }))
            setIsEditing(false)
            setTimeout(() => modalRef.current?.focus(), 50)
        }, 0)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isHotkey(e, KEYBINDINGS.MODALS.SAVE)) {
            e.preventDefault()
            if (isEditing) {
                saveFieldEdit()
            }
            // Add slight delay to let state update if we just saved a field
            setTimeout(handleSave, 50)
            return
        }

        if (!isEditing) {
            if (isHotkey(e, KEYBINDINGS.MODALS.NAV_DOWN)) {
                e.preventDefault()
                setFocusedFieldIdx((prev) => (prev + 1) % fields.length)
            } else if (isHotkey(e, KEYBINDINGS.MODALS.NAV_UP)) {
                e.preventDefault()
                setFocusedFieldIdx((prev) => (prev - 1 + fields.length) % fields.length)
            } else if (isHotkey(e, KEYBINDINGS.MODALS.SELECT_AND_SAVE_OPTION)) {
                e.preventDefault()
                const field = fields[focusedFieldIdx]
                if (field.id === 'scheduled_at') {
                    // Format for datetime-local input: "YYYY-MM-DDThh:mm"
                    const dateObj = editedTask?.scheduled_at ? new Date(editedTask.scheduled_at) : new Date()
                    const tzOffset = dateObj.getTimezoneOffset() * 60000
                    const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16)
                    setEditValue(localISOTime)
                } else {
                    setEditValue(field.id === 'duration' ? (editedTask?.estimated_duration_minutes || 30).toString() : (editedTask?.[field.id] || ''))
                }
                setIsEditing(true)
                setDropdownFocusIdx(0)
            } else if (isHotkey(e, KEYBINDINGS.MODALS.CLOSE)) {
                e.preventDefault()
                handleClose()
            }
        } else {
            if (filteredOptions.length > 0 && (isHotkey(e, KEYBINDINGS.MODALS.NAV_DOWN) || isHotkey(e, KEYBINDINGS.MODALS.NAV_UP))) {
                e.preventDefault()
                if (isHotkey(e, KEYBINDINGS.MODALS.NAV_DOWN)) setDropdownFocusIdx(prev => Math.min(prev + 1, filteredOptions.length - 1))
                if (isHotkey(e, KEYBINDINGS.MODALS.NAV_UP)) setDropdownFocusIdx(prev => Math.max(prev - 1, 0))
            } else if (isHotkey(e, KEYBINDINGS.MODALS.CLOSE)) {
                e.preventDefault()
                setIsEditing(false)
            } else if (isHotkey(e, KEYBINDINGS.MODALS.SELECT_OPTION)) {
                e.preventDefault()
                if (filteredOptions.length > 0) {
                    saveOption(filteredOptions[safeDropdownFocusIdx])
                } else {
                    saveFieldEdit()
                }
            }
        }
    }

    const saveFieldEdit = () => {
        const field = fields[focusedFieldIdx].id
        let val: any = editValue
        
        if (field === 'duration') {
            val = parseInt(editValue)
            if (isNaN(val) || val <= 0) val = 30
        } else if (field === 'scheduled_at') {
            // editValue is from datetime-local input
            val = editValue ? new Date(editValue).toISOString() : null
        }

        setEditedTask((prev: any) => ({ ...prev, [field === 'duration' ? 'estimated_duration_minutes' : field]: val }))
        setIsEditing(false)
        setTimeout(() => modalRef.current?.focus(), 50)
    }

    const handleSave = () => {
        if (!editedTask || isPending) return
        updateTask({
            id: editedTask.id,
            title: editedTask.title,
            description: editedTask.description,
            scheduled_at: editedTask.scheduled_at,
            priority: editedTask.priority,
            category: editedTask.category,
            estimated_duration_minutes: editedTask.estimated_duration_minutes
        }, {
            onSuccess: handleClose
        })
    }

    const handleClose = () => {
        setIsEditing(false)
        onClose()
    }

    if (!open || !editedTask) return null

    // Render Dropdown options for specific fields when editing
    const renderEditOptions = () => {
        if (filteredOptions.length === 0) return null

        return (
            <div className="absolute top-full left-0 mt-2 w-full bg-popover border border-border rounded-xl shadow-island-lg overflow-hidden z-50">
                <div className="py-1">
                    {filteredOptions.map((opt, idx) => (
                        <div
                            key={opt}
                            className={`px-3 py-2 mx-1 flex items-center justify-between rounded-lg cursor-pointer text-foreground ${idx === safeDropdownFocusIdx ? 'bg-muted' : 'hover:bg-muted/50'}`}
                            onClick={() => saveOption(opt)}
                            onMouseEnter={() => setDropdownFocusIdx(idx)}
                        >
                            <span className="text-sm font-medium capitalize">{currentField.id === 'duration' ? formatDuration(parseInt(opt)) : opt}</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 bg-background/40 backdrop-blur-sm"
                    onClick={handleClose}
                    aria-hidden="true"
                />

                <motion.div
                    ref={modalRef}
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="relative w-full max-w-xl mx-4 bg-card border border-border shadow-island-lg rounded-2xl overflow-visible outline-none flex flex-col"
                    tabIndex={-1}
                    onKeyDown={handleKeyDown}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-task-title"
                    aria-describedby="edit-task-description"
                >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                                <Type size={12} className="text-primary" />
                            </div>
                            <span id="edit-task-title" className="text-sm font-semibold text-foreground">Edit Task</span>
                        </div>
                        <button 
                            onClick={handleClose} 
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                            aria-label="Close modal"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Field List */}
                    <div id="edit-task-description" className="p-2 flex flex-col gap-1 outline-none" role="list" aria-label="Task fields">
                        {fields.map((field, idx) => {
                            const isFocused = focusedFieldIdx === idx
                            const Icon = field.icon
                            
                            return (
                                <div 
                                    key={field.id}
                                    role="listitem"
                                    tabIndex={isFocused ? 0 : -1}
                                    className={`relative flex items-center p-3 rounded-xl transition-colors ${
                                        isFocused ? 'bg-primary/5 border border-primary/20 shadow-sm' : 'border border-transparent hover:bg-muted/50'
                                    }`}
                                    onClick={() => {
                                        setFocusedFieldIdx(idx)
                                        if (!isEditing) {
                                            if (field.id === 'scheduled_at') {
                                                const dateObj = editedTask?.scheduled_at ? new Date(editedTask.scheduled_at) : new Date()
                                                const tzOffset = dateObj.getTimezoneOffset() * 60000
                                                const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16)
                                                setEditValue(localISOTime)
                                            } else {
                                                setEditValue(field.id === 'duration' ? (editedTask?.estimated_duration_minutes || 30).toString() : (editedTask?.[field.id] || ''))
                                            }
                                            setIsEditing(true)
                                            setDropdownFocusIdx(0)
                                        }
                                    }}
                                    aria-label={`${field.label}: ${field.value}`}
                                    aria-current={isFocused ? 'true' : undefined}
                                >
                                    <div className="flex items-center gap-3 w-32 shrink-0">
                                        <Icon size={14} className={isFocused ? 'text-primary' : 'text-muted-foreground'} />
                                        <span className={`text-xs font-semibold ${isFocused ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {field.label}
                                        </span>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        {isFocused && isEditing ? (
                                            <div className="relative">
                                                <input
                                                    ref={inputRef}
                                                    type={field.id === 'scheduled_at' ? 'datetime-local' : 'text'}
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                    aria-label={`Edit ${field.label.toLowerCase()}`}
                                                />
                                                {renderEditOptions()}
                                            </div>
                                        ) : (
                                            <span className={`text-sm truncate block ${
                                                field.value === 'No description' || !field.value ? 'text-muted-foreground italic' : 'text-foreground font-medium'
                                            } ${field.id === 'priority' || field.id === 'category' ? 'capitalize' : ''}`}>
                                                {field.value || 'None'}
                                            </span>
                                        )}
                                    </div>

                                    {isFocused && !isEditing && (
                                        <div className="ml-3 flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded border border-border">
                                            <span>Enter</span>
                                            <CornerDownLeft size={10} />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Subtasks Section */}
                    {editedTask && (
                        <div className="px-4 pb-3 border-t border-border pt-3">
                            <SubtaskList
                                taskId={editedTask.id}
                                subtasks={subtasks}
                                onAddSubtask={async (title) => {
                                    try {
                                        await apiClient.subtasks.create(editedTask.id, { title })
                                        refetchSubtasks()
                                    } catch (e) {
                                        console.error('Failed to create subtask', e)
                                    }
                                }}
                                onToggleSubtask={async (subtaskId) => {
                                    const subtask = subtasks.find((s: any) => s.id === subtaskId)
                                    if (!subtask) return
                                    const newStatus = subtask.status === 'completed' ? 'not_started' : 'completed'
                                    try {
                                        await apiClient.subtasks.update(editedTask.id, subtaskId, { status: newStatus })
                                        refetchSubtasks()
                                    } catch (e) {
                                        console.error('Failed to toggle subtask', e)
                                    }
                                }}
                                onDeleteSubtask={async (subtaskId) => {
                                    try {
                                        await apiClient.subtasks.delete(editedTask.id, subtaskId)
                                        refetchSubtasks()
                                    } catch (e) {
                                        console.error('Failed to delete subtask', e)
                                    }
                                }}
                                onReorder={async (subtaskIds) => {
                                    try {
                                        await apiClient.subtasks.reorder(editedTask.id, subtaskIds)
                                        refetchSubtasks()
                                    } catch (e) {
                                        console.error('Failed to reorder subtasks', e)
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* Footer */}
                    <div className="bg-muted/30 px-4 py-3 border-t border-border flex items-center justify-between rounded-b-2xl">
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                            <span className="flex items-center gap-1"><ArrowUp size={12} /><ArrowDown size={12} /> Navigate</span>
                            <span className="flex items-center gap-1"><CornerDownLeft size={12} /> Edit</span>
                        </div>
                        <button 
                            onClick={handleSave}
                            disabled={isPending}
                            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                        >
                            <Save size={14} />
                            Save Changes (⌘↵)
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
