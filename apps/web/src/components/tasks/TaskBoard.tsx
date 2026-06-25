"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    DndContext, 
    DragOverlay, 
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent
} from "@dnd-kit/core"
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { TaskColumn } from "./TaskColumn"
import { TaskCard } from "./TaskCard"
import { type Task, useUpdateTask } from "@/hooks/useTasks"
import { EditTaskModal } from "@/components/tasks/EditTaskModal"
import { SubtaskModal } from "@/components/tasks/SubtaskModal"
import { KEYBINDINGS } from "@/config/keybindings"
import { isHotkey } from "@/utils/keyboard"
import { apiClient } from "@/utils/apiClient"

const COLUMNS = [
    { id: "not_started", title: "To Do" },
    { id: "missed", title: "Overdue" },
    { id: "in_progress", title: "Doing" },
    { id: "completed", title: "Completed" },
] as const

interface TaskBoardProps {
    initialTasks: Task[]
}

export default function TaskBoard({ initialTasks }: TaskBoardProps) {
    const [tasks, setTasks] = useState<Task[]>(initialTasks)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false)
    const [expandedSubtaskIds, setExpandedSubtaskIds] = useState<Set<string>>(new Set())
    const queryClient = useQueryClient()
    
    useEffect(() => {
        setTasks(initialTasks)
    }, [initialTasks])
    const supabase = createClient()

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const updateTaskStatus = useUpdateTask()

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null)
        const { active, over } = event

        if (!over) return

        const activeIdStr = active.id as string
        const overIdStr = over.id as string

        const activeTask = tasks.find(t => t.id === activeIdStr)
        const overTask = tasks.find(t => t.id === overIdStr)

        if (!activeTask) return

        // Dropping over a column
        const isOverColumn = COLUMNS.some(c => c.id === overIdStr)
        if (isOverColumn) {
            const newStatus = overIdStr as Task["status"]
            if (activeTask.status !== newStatus) {
                // Optimistic UI update
                setTasks(prev => prev.map(t => 
                    t.id === activeIdStr ? { ...t, status: newStatus } : t
                ))
                // Fire mutation
                updateTaskStatus.mutate({ id: activeIdStr, status: newStatus })
            }
            return
        }

        // Dropping over another task
        if (overTask && activeTask.status !== overTask.status) {
            const newStatus = overTask.status
            setTasks(prev => prev.map(t => 
                t.id === activeIdStr ? { ...t, status: newStatus } : t
            ))
            updateTaskStatus.mutate({ id: activeIdStr, status: newStatus })
        }
    }

    const getTasksByStatus = (status: string) => {
        return tasks.filter(t => t.status === status)
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

            const flattenedTasks = COLUMNS.flatMap(c => getTasksByStatus(c.id));
            if (flattenedTasks.length === 0) return;

            const currentIndex = flattenedTasks.findIndex(t => t.id === focusedTaskId);

            if (isHotkey(e, KEYBINDINGS.TASK_BOARD.NAV_DOWN)) {
                e.preventDefault();
                const nextIndex = currentIndex < flattenedTasks.length - 1 ? currentIndex + 1 : 0;
                setFocusedTaskId(flattenedTasks[nextIndex].id);
            } else if (isHotkey(e, KEYBINDINGS.TASK_BOARD.NAV_UP)) {
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : flattenedTasks.length - 1;
                setFocusedTaskId(flattenedTasks[prevIndex].id);
            } else if (isHotkey(e, KEYBINDINGS.TASK_BOARD.DESELECT)) {
                setFocusedTaskId(null);
            } else if (focusedTaskId && isHotkey(e, KEYBINDINGS.TASK_BOARD.TOGGLE_COMPLETE)) {
                e.preventDefault();
                updateTaskStatus.mutate({ id: focusedTaskId, status: 'completed' });
                setTasks(prev => prev.map(t => 
                    t.id === focusedTaskId ? { ...t, status: 'completed' } : t
                ))
            } else if (focusedTaskId && isHotkey(e, KEYBINDINGS.TASK_BOARD.EDIT_TASK)) {
                e.preventDefault();
                const task = tasks.find(t => t.id === focusedTaskId);
                if (task) {
                    setSelectedTask(task);
                    setIsEditModalOpen(true);
                }
            } else if (focusedTaskId && isHotkey(e, KEYBINDINGS.TASK_BOARD.MOVE_RIGHT)) {
                e.preventDefault();
                const task = tasks.find(t => t.id === focusedTaskId);
                if (task) {
                    const colIndex = COLUMNS.findIndex(c => c.id === task.status);
                    if (colIndex !== -1 && colIndex < COLUMNS.length - 1) {
                        const newStatus = COLUMNS[colIndex + 1].id;
                        updateTaskStatus.mutate({ id: focusedTaskId, status: newStatus as any });
                        setTasks(prev => prev.map(t => 
                            t.id === focusedTaskId ? { ...t, status: newStatus as any } : t
                        ));
                    }
                }
            } else if (focusedTaskId && isHotkey(e, KEYBINDINGS.TASK_BOARD.MOVE_LEFT)) {
                e.preventDefault();
                const task = tasks.find(t => t.id === focusedTaskId);
                if (task) {
                    const colIndex = COLUMNS.findIndex(c => c.id === task.status);
                    if (colIndex > 0) {
                        const newStatus = COLUMNS[colIndex - 1].id;
                        updateTaskStatus.mutate({ id: focusedTaskId, status: newStatus as any });
                        setTasks(prev => prev.map(t => 
                            t.id === focusedTaskId ? { ...t, status: newStatus as any } : t
                        ));
                    }
                }
            } else if (focusedTaskId && e.key === '>') {
                e.preventDefault();
                setExpandedSubtaskIds(prev => new Set([...prev, focusedTaskId]));
            } else if (focusedTaskId && e.key === '<') {
                e.preventDefault();
                setExpandedSubtaskIds(prev => {
                    const next = new Set(prev);
                    next.delete(focusedTaskId);
                    return next;
                });
            } else if (focusedTaskId && e.key === 's') {
                e.preventDefault();
                const task = tasks.find(t => t.id === focusedTaskId);
                if (task) {
                    setSelectedTask(task);
                    setIsSubtaskModalOpen(true);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [tasks, focusedTaskId, updateTaskStatus]);

    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task)
        setIsEditModalOpen(true)
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex-1 flex gap-6 overflow-x-auto pb-4 scrollbar-thin">
                {COLUMNS.map(col => (
                    <TaskColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        tasks={getTasksByStatus(col.id)}
                        focusedTaskId={focusedTaskId}
                        onTaskClick={handleTaskClick}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
            </DragOverlay>

            <EditTaskModal 
                open={isEditModalOpen} 
                onClose={() => {
                    setIsEditModalOpen(false)
                    setTimeout(() => setSelectedTask(null), 200)
                }} 
                task={selectedTask} 
            />

            <SubtaskModal
                isOpen={isSubtaskModalOpen}
                onClose={() => setIsSubtaskModalOpen(false)}
                onSave={async (title, options) => {
                    if (!selectedTask) return
                    try {
                        await apiClient.subtasks.create(selectedTask.id, {
                            title,
                            priority: options?.priority,
                            estimated_duration_minutes: options?.duration,
                        })
                        queryClient.invalidateQueries({ queryKey: ['subtasks', selectedTask.id] })
                    } catch (e) {
                        console.error('Failed to create subtask:', e)
                    }
                }}
            />
        </DndContext>
    )
}
