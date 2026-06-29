"use client"

import { useState, useEffect, useRef } from "react"

const genTempId = () => `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`
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
import {  sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import {  useQueryClient, useQueries } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { TaskColumn } from "./TaskColumn"
import { TaskCard } from "./TaskCard"
import { type Task, useUpdateTask, useDeleteTask } from "@/hooks/useTasks"
import { useRoutines } from "@/hooks/useRoutines"
import { EditTaskModal } from "@/components/tasks/EditTaskModal"
import { SubtaskModal } from "@/components/tasks/SubtaskModal"
import { KEYBINDINGS } from "@/config/keybindings"
import { isHotkey } from "@/utils/keyboard"
import { apiClient } from "@/utils/apiClient"

type Subtask = {
    id: string
    title: string
    status: "not_started" | "in_progress" | "completed" | "missed" | "cancelled"
    priority: "critical" | "high" | "medium" | "low"
    estimated_duration_minutes: number
    order_index: number
}

type BoardItem = Task | (Subtask & { parentTaskId: string })

const isSubtaskItem = (item: BoardItem): item is Subtask & { parentTaskId: string } =>
    !!item && typeof item === 'object' && 'parentTaskId' in item

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
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
    const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false)
    const [expandedSubtaskIds, setExpandedSubtaskIds] = useState<Set<string>>(new Set())
    const [subtasksByTaskId, setSubtasksByTaskId] = useState<Record<string, Subtask[]>>({})
    const [editingSubtask, setEditingSubtask] = useState<{ taskId: string; subtask: Subtask } | null>(null)
    const [filterRoutineId, setFilterRoutineId] = useState<string | null>(null)
    const [groupByRoutine, setGroupByRoutine] = useState(false)
    const queryClient = useQueryClient()
    const { data: routines = [] } = useRoutines()
    
    // Key sequence buffer for multi-key shortcuts (e.g. 'ul')
    const keyBuffer = useRef<string[]>([])
    const bufferTimeout = useRef<NodeJS.Timeout | null>(null)
    
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
    const deleteTask = useDeleteTask()

    const filteredTasks = filterRoutineId
        ? tasks.filter(t => t.routine_id === filterRoutineId)
        : tasks

    const getSubtasksForTask = (taskId: string) => subtasksByTaskId[taskId] || []

    const getTasksByStatus = (status: Task["status"]) => {
        return filteredTasks.filter(t => t.status === status)
    }

    const getFlattenedTasks = () => {
        return COLUMNS.flatMap(c => {
            return getTasksByStatus(c.id).flatMap(task => {
                const taskItems: BoardItem[] = [task]
                if (expandedSubtaskIds.has(task.id)) {
                    const subtasks = getSubtasksForTask(task.id).slice().sort((a, b) => a.order_index - b.order_index)
                    taskItems.push(...subtasks.map(subtask => ({ ...subtask, parentTaskId: task.id })))
                }
                return taskItems
            })
        })
    }

    const getTaskIdsBetween = (startId: string, endId: string) => {
        const flattenedTasks = getFlattenedTasks()
        const startIndex = flattenedTasks.findIndex(item => item.id === startId)
        const endIndex = flattenedTasks.findIndex(item => item.id === endId)
        if (startIndex === -1 || endIndex === -1) return []
        const [from, to] = startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
        return flattenedTasks.slice(from, to + 1).map(item => item.id)
    }

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
                setTasks(prev => prev.map(t => 
                    t.id === activeIdStr ? { ...t, status: newStatus } : t
                ))
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

    const deleteSubtask = async (taskId: string, subtaskId: string) => {
        try {
            await apiClient.subtasks.delete(taskId, subtaskId)
            removeSubtaskState(taskId, subtaskId)
        } catch (error) {
            console.error('Failed to delete subtask', error)
            throw error
        }
    }

    const findBoardItem = (id: string | null): BoardItem | null => {
        if (!id) return null
        const task = tasks.find(t => t.id === id)
        if (task) return task
        for (const [taskId, subtasks] of Object.entries(subtasksByTaskId)) {
            const subtask = subtasks.find(st => st.id === id)
            if (subtask) {
                return { ...subtask, parentTaskId: taskId }
            }
        }
        return null
    }

    const getTaskIdsFromSelection = (ids: string[]) => {
        const taskIds = new Set<string>()
        ids.forEach(id => {
            const item = findBoardItem(id)
            if (!item) return
            if (isSubtaskItem(item)) {
                taskIds.add(item.parentTaskId)
            } else {
                taskIds.add(item.id)
            }
        })
        return Array.from(taskIds)
    }

    const updateStatusForTaskIds = (ids: string[], status: Task['status']) => {
        const taskIds = getTaskIdsFromSelection(ids)
        if (!taskIds.length) return
        setTasks(prev => prev.map(t => taskIds.includes(t.id) ? { ...t, status } : t))
        taskIds.forEach(id => updateTaskStatus.mutate({ id, status }))
    }

    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
            if (isEditModalOpen || isSubtaskModalOpen) return;

            const flattenedTasks = getFlattenedTasks();
            if (flattenedTasks.length === 0) return;

            const currentIndex = flattenedTasks.findIndex(item => item.id === focusedTaskId);
            const key = e.key.toLowerCase();

            // Handle 'u' prefix sequences (like 'u' -> 'l')
            if (keyBuffer.current[0] === 'u') {
                e.preventDefault();
                if (bufferTimeout.current) clearTimeout(bufferTimeout.current);
                keyBuffer.current = [];
                
                if (key === 'l') {
                    // Unlock the task
                    if (focusedTaskId || selectedTaskIds.size > 0) {
                        const targetIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : [focusedTaskId!];
                        setTasks(prev => prev.map(t => targetIds.includes(t.id) ? { ...t, is_time_locked: false } : t));
                        targetIds.forEach((id) => updateTaskStatus.mutate({ id, is_time_locked: false }));
                    }
                    return;
                }
            }

            // Start 'u' sequence
            if (key === 'u' && !e.ctrlKey && !e.metaKey && !e.altKey && (focusedTaskId || selectedTaskIds.size > 0)) {
                e.preventDefault();
                keyBuffer.current = ['u'];
                
                // Clear the buffer after a short delay so they don't get stuck in 'u' mode forever
                bufferTimeout.current = setTimeout(() => {
                    keyBuffer.current = [];
                }, 400); 
                return;
            }

            if (isHotkey(e, KEYBINDINGS.TASK_BOARD.SHIFT_SELECT_DOWN)) {
                e.preventDefault();
                const nextIndex = currentIndex < flattenedTasks.length - 1 ? currentIndex + 1 : flattenedTasks.length - 1;
                const nextTask = flattenedTasks[nextIndex]
                if (!nextTask) return
                const anchorId = selectionAnchorId || focusedTaskId || Array.from(selectedTaskIds)[0] || nextTask.id
                if (!selectionAnchorId) setSelectionAnchorId(anchorId)
                setFocusedTaskId(nextTask.id)
                setSelectedTaskIds(new Set(getTaskIdsBetween(anchorId, nextTask.id)))
            } else if (isHotkey(e, KEYBINDINGS.TASK_BOARD.SHIFT_SELECT_UP)) {
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
                const nextTask = flattenedTasks[prevIndex]
                if (!nextTask) return
                const anchorId = selectionAnchorId || focusedTaskId || Array.from(selectedTaskIds)[0] || nextTask.id
                if (!selectionAnchorId) setSelectionAnchorId(anchorId)
                setFocusedTaskId(nextTask.id)
                setSelectedTaskIds(new Set(getTaskIdsBetween(anchorId, nextTask.id)))
            } else if (isHotkey(e, KEYBINDINGS.TASK_BOARD.NAV_DOWN)) {
                e.preventDefault();
                const nextIndex = currentIndex < flattenedTasks.length - 1 ? currentIndex + 1 : 0;
                setFocusedTaskId(flattenedTasks[nextIndex].id);
                setSelectionAnchorId(null)
            } else if (isHotkey(e, KEYBINDINGS.TASK_BOARD.NAV_UP)) {
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : flattenedTasks.length - 1;
                setFocusedTaskId(flattenedTasks[prevIndex].id);
                setSelectionAnchorId(null)
            } else if (isHotkey(e, KEYBINDINGS.TASK_BOARD.DESELECT)) {
                setFocusedTaskId(null);
                setSelectedTaskIds(new Set());
                setSelectionAnchorId(null)
            } else if (isHotkey(e, KEYBINDINGS.TASK_BOARD.BULK_SELECT)) {
                e.preventDefault();
                if (focusedTaskId) {
                    setSelectionAnchorId(focusedTaskId)
                    setSelectedTaskIds(prev => {
                        const next = new Set(prev);
                        if (next.has(focusedTaskId)) {
                            next.delete(focusedTaskId);
                        } else {
                            next.add(focusedTaskId);
                        }
                        return next;
                    });
                }
            } else if ((focusedTaskId || selectedTaskIds.size > 0) && isHotkey(e, KEYBINDINGS.TASK_BOARD.TOGGLE_COMPLETE)) {
                e.preventDefault();
                const targetIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : [focusedTaskId!];
                for (const id of targetIds) {
                    const item = findBoardItem(id)
                    if (!item) continue
                    if (isSubtaskItem(item)) {
                        await handleSubtaskToggle(item.parentTaskId, id)
                    } else {
                        updateTaskStatus.mutate({ id, status: 'completed' });
                        setTasks(prev => prev.map(t => 
                            t.id === id ? { ...t, status: 'completed' } : t
                        ));
                    }
                }
                if (selectedTaskIds.size > 0) setSelectedTaskIds(new Set());
            } else if (focusedTaskId && isHotkey(e, KEYBINDINGS.TASK_BOARD.EDIT_TASK)) {
                e.preventDefault();
                const item = findBoardItem(focusedTaskId);
                if (item) {
                    if (isSubtaskItem(item)) {
                        setEditingSubtask({ taskId: item.parentTaskId, subtask: item })
                        setIsSubtaskModalOpen(true)
                    } else {
                        setSelectedTask(item)
                        setIsEditModalOpen(true)
                    }
                }
            } else if ((focusedTaskId || selectedTaskIds.size > 0) && isHotkey(e, KEYBINDINGS.TASK_BOARD.SET_TIME_LOCK)) {
                e.preventDefault();
                const targetIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : [focusedTaskId!];
                
                const firstTask = findBoardItem(targetIds[0]);
                const newLockStatus = firstTask && !isSubtaskItem(firstTask) ? !firstTask.is_time_locked : true;
                
                setTasks(prev => prev.map(t => targetIds.includes(t.id) ? { ...t, is_time_locked: newLockStatus } : t));
                targetIds.forEach((id) => updateTaskStatus.mutate({ id, is_time_locked: newLockStatus }));
            } else if ((focusedTaskId || selectedTaskIds.size > 0) && isHotkey(e, KEYBINDINGS.TASK_BOARD.SET_STATUS_TODO)) {
                e.preventDefault();
                const targetIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : [focusedTaskId!];
                updateStatusForTaskIds(targetIds, 'not_started');
            } else if ((focusedTaskId || selectedTaskIds.size > 0) && isHotkey(e, KEYBINDINGS.TASK_BOARD.SET_STATUS_OVERDUE)) {
                e.preventDefault();
                const targetIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : [focusedTaskId!];
                updateStatusForTaskIds(targetIds, 'missed');
            } else if ((focusedTaskId || selectedTaskIds.size > 0) && isHotkey(e, KEYBINDINGS.TASK_BOARD.SET_STATUS_DOING)) {
                e.preventDefault();
                const targetIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : [focusedTaskId!];
                updateStatusForTaskIds(targetIds, 'in_progress');
            } else if ((focusedTaskId || selectedTaskIds.size > 0) && isHotkey(e, KEYBINDINGS.TASK_BOARD.SET_PRIORITY_CRITICAL)) {
                e.preventDefault();
                const targetIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : [focusedTaskId!];
                setTasks(prev => prev.map(t => targetIds.includes(t.id) ? { ...t, priority: 'critical' } : t));
                targetIds.forEach((id) => updateTaskStatus.mutate({ id, priority: 'critical' }));
            } else if ((focusedTaskId || selectedTaskIds.size > 0) && isHotkey(e, KEYBINDINGS.TASK_BOARD.SET_PRIORITY_HIGH)) {
                e.preventDefault();
                const targetIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : [focusedTaskId!];
                setTasks(prev => prev.map(t => targetIds.includes(t.id) ? { ...t, priority: 'high' } : t));
                targetIds.forEach((id) => updateTaskStatus.mutate({ id, priority: 'high' }));
            } else if ((focusedTaskId || selectedTaskIds.size > 0) && isHotkey(e, KEYBINDINGS.TASK_BOARD.SET_PRIORITY_MEDIUM)) {
                e.preventDefault();
                const targetIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : [focusedTaskId!];
                setTasks(prev => prev.map(t => targetIds.includes(t.id) ? { ...t, priority: 'medium' } : t));
                targetIds.forEach((id) => updateTaskStatus.mutate({ id, priority: 'medium' }));
            } else if ((focusedTaskId || selectedTaskIds.size > 0) && isHotkey(e, KEYBINDINGS.TASK_BOARD.SET_PRIORITY_LOW)) {
                e.preventDefault();
                const targetIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : [focusedTaskId!];
                setTasks(prev => prev.map(t => targetIds.includes(t.id) ? { ...t, priority: 'low' } : t));
                targetIds.forEach((id) => updateTaskStatus.mutate({ id, priority: 'low' }));
            } else if (focusedTaskId && isHotkey(e, KEYBINDINGS.TASK_BOARD.EXPAND_SUBTASKS)) {
                e.preventDefault();
                const item = findBoardItem(focusedTaskId);
                const parentTaskId = item && isSubtaskItem(item) ? item.parentTaskId : focusedTaskId;
                setExpandedSubtaskIds(prev => new Set([...prev, parentTaskId]));
            } else if (focusedTaskId && isHotkey(e, KEYBINDINGS.TASK_BOARD.COLLAPSE_SUBTASKS)) {
                e.preventDefault();
                const item = findBoardItem(focusedTaskId);
                const parentTaskId = item && isSubtaskItem(item) ? item.parentTaskId : focusedTaskId;
                setExpandedSubtaskIds(prev => {
                    const next = new Set(prev);
                    next.delete(parentTaskId);
                    return next;
                });
            } else if (focusedTaskId && isHotkey(e, KEYBINDINGS.TASK_BOARD.ADD_SUBTASK)) {
                e.preventDefault();
                const item = findBoardItem(focusedTaskId);
                if (item) {
                    const task = isSubtaskItem(item) ? tasks.find(t => t.id === item.parentTaskId) : item
                    if (task) {
                        setSelectedTask(task);
                        setIsSubtaskModalOpen(true);
                    }
                }
            } else if (focusedTaskId && isHotkey(e, KEYBINDINGS.TASK_BOARD.DELETE_TASK)) {
                e.preventDefault();
                const targetIds = selectedTaskIds.size > 0 ? Array.from(selectedTaskIds) : [focusedTaskId];
                for (const id of targetIds) {
                    const item = findBoardItem(id)
                    if (!item) continue
                    if (isSubtaskItem(item)) {
                        await handleSubtaskDelete(item.parentTaskId, id)
                    } else {
                        deleteTask.mutate(id)
                        setTasks(prev => prev.filter(t => t.id !== id))
                    }
                }
                if (selectedTaskIds.size > 0) setSelectedTaskIds(new Set());
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (bufferTimeout.current) clearTimeout(bufferTimeout.current);
        }
    }, [tasks, focusedTaskId, updateTaskStatus, deleteTask, selectedTaskIds, expandedSubtaskIds, subtasksByTaskId]);

    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

    const fetchSubtasksForTask = async (taskId: string) => {
        if (subtasksByTaskId[taskId]) return
        // prefer cached react-query data if available
        const cached = queryClient.getQueryData<any[]>(['subtasks', taskId])
        if (cached) {
            setSubtasksByTaskId(prev => ({ ...prev, [taskId]: cached }))
            return
        }
        try {
            const data = await apiClient.subtasks.list(taskId).then(r => r.data || [])
            setSubtasksByTaskId(prev => ({ ...prev, [taskId]: data }))
        } catch (error) {
            console.error('Failed to fetch subtasks for task', taskId, error)
        }
    }

    useEffect(() => {
        expandedSubtaskIds.forEach(taskId => {
            if (!subtasksByTaskId[taskId]) {
                fetchSubtasksForTask(taskId)
            }
        })
    }, [expandedSubtaskIds, subtasksByTaskId])

    // Keep local subtask state in sync with react-query cache for expanded tasks
    const expandedTaskIds = Array.from(expandedSubtaskIds)
    const subtaskQueries = useQueries({
        queries: expandedTaskIds.map(taskId => ({
            queryKey: ['subtasks', taskId],
            queryFn: () => apiClient.subtasks.list(taskId).then(r => r.data || []),
            enabled: true,
            staleTime: 1000 * 60, // 1 minute
        }))
    })

    useEffect(() => {
        if (!expandedTaskIds.length) return
        subtaskQueries.forEach((res, idx) => {
            const taskId = expandedTaskIds[idx]
            if (!taskId) return
            if (res.data) {
                setSubtasksByTaskId(prev => ({ ...prev, [taskId]: res.data }))
            }
        })
    }, [JSON.stringify(expandedTaskIds), subtaskQueries.map(q => q.data).join('|')])

    const updateSubtaskState = (taskId: string, subtaskId: string, updater: (subtask: Subtask) => Subtask) => {
        setSubtasksByTaskId(prev => {
            const existing = prev[taskId]
            if (!existing) return prev
            return {
                ...prev,
                [taskId]: existing.map(st => (st.id === subtaskId ? updater(st) : st)),
            }
        })
    }

    const addSubtaskState = (taskId: string, subtask: Subtask) => {
        setSubtasksByTaskId(prev => {
            const existing = prev[taskId] || []
            return {
                ...prev,
                [taskId]: [...existing, subtask].slice().sort((a, b) => a.order_index - b.order_index),
            }
        })
    }

    const removeSubtaskState = (taskId: string, subtaskId: string) => {
        setSubtasksByTaskId(prev => {
            const existing = prev[taskId]
            if (!existing) return prev
            return {
                ...prev,
                [taskId]: existing.filter(st => st.id !== subtaskId),
            }
        })
    }

    const handleSubtaskToggle = async (taskId: string, subtaskId: string) => {
        const subtasks = getSubtasksForTask(taskId)
        const subtask = subtasks.find(st => st.id === subtaskId)
        if (!subtask) return
        const newStatus = subtask.status === 'completed' ? 'not_started' : 'completed'
        try {
            await apiClient.subtasks.update(taskId, subtaskId, { status: newStatus })
            updateSubtaskState(taskId, subtaskId, () => ({ ...subtask, status: newStatus }))
        } catch (error) {
            console.error('Failed to toggle subtask status', error)
        }
    }

    const handleSubtaskDelete = async (taskId: string, subtaskId: string) => {
        const previousSubtasks = subtasksByTaskId[taskId] || []
        removeSubtaskState(taskId, subtaskId)

        try {
            await deleteSubtask(taskId, subtaskId)
        } catch (error) {
            console.error('Failed to delete subtask', error)
            setSubtasksByTaskId(prev => ({
                ...prev,
                [taskId]: previousSubtasks,
            }))
        }
    }

    const handleSubtaskSave = async (title: string, options?: { priority?: Subtask['priority']; duration?: number }) => {
        if (editingSubtask) {
            const { taskId, subtask } = editingSubtask
            const previous = getSubtasksForTask(taskId).slice()

            const updatedSubtask: Subtask = {
                ...subtask,
                title,
                priority: options?.priority || subtask.priority,
                estimated_duration_minutes: options?.duration ?? subtask.estimated_duration_minutes,
            }

            // Optimistically update
            updateSubtaskState(taskId, subtask.id, () => updatedSubtask)
            setEditingSubtask(null)

            try {
                await apiClient.subtasks.update(taskId, subtask.id, {
                    title,
                    priority: options?.priority,
                    estimated_duration_minutes: options?.duration,
                })
                queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] })
            } catch (e) {
                console.error('Failed to update subtask:', e)
                // rollback
                setSubtasksByTaskId(prev => ({ ...prev, [taskId]: previous }))
            }
        } else if (selectedTask) {
            const taskId = selectedTask.id
            // ensure expanded
            setExpandedSubtaskIds(prev => new Set([...prev, taskId]))

            const existing = getSubtasksForTask(taskId)
            const tempId = genTempId()
            const tempOrder = existing.length > 0 ? Math.max(...existing.map(s => s.order_index)) + 1 : 0
            const tempSubtask: Subtask = {
                id: tempId,
                title,
                status: 'not_started',
                priority: options?.priority || 'medium',
                estimated_duration_minutes: options?.duration ?? 15,
                order_index: tempOrder,
            }

            // Optimistically add
            addSubtaskState(taskId, tempSubtask)

            try {
                const response = await apiClient.subtasks.create(taskId, {
                    title,
                    priority: options?.priority,
                    estimated_duration_minutes: options?.duration,
                })
                const createdSubtask = response?.data
                if (createdSubtask) {
                    // replace temp with real
                    setSubtasksByTaskId(prev => {
                        const list = (prev[taskId] || []).map(st => (st.id === tempId ? createdSubtask : st))
                        return { ...prev, [taskId]: list }
                    })
                } else {
                    await fetchSubtasksForTask(taskId)
                }
                queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] })
            } catch (e) {
                console.error('Failed to create subtask:', e)
                // rollback: remove temp
                removeSubtaskState(taskId, tempId)
            }
        }
    }

    const handleTaskClick = (task: Task) => {
        setFocusedTaskId(task.id)
    }

    const getGroupedTasks = (status: Task["status"]) => {
        const statusTasks = filteredTasks.filter(t => t.status === status)
        if (!groupByRoutine) {
            return [{ routine: null, tasks: statusTasks }]
        }
        
        const grouped = new Map<string | null, Task[]>()
        statusTasks.forEach(task => {
            const routineId = task.routine_id || null
            if (!grouped.has(routineId)) {
                grouped.set(routineId, [])
            }
            grouped.get(routineId)!.push(task)
        })
        
        return Array.from(grouped.entries()).map(([routineId, tasks]) => ({
            routine: routineId ? (routines.find(r => r.id === routineId) || null) : null,
            tasks
        }))
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {/* Routine Filter Bar */}
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">Filter by Routine:</span>
                    <select
                        value={filterRoutineId || ""}
                        onChange={(e) => setFilterRoutineId(e.target.value || null)}
                        className="bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm hover:border-border transition-colors"
                    >
                        <option value="">All Routines</option>
                        {routines.map(r => (
                            <option key={r.id} value={r.id}>{r.title} ({tasks.filter(t => t.routine_id === r.id).length})</option>
                        ))}
                    </select>
                    {filterRoutineId && (
                        <button
                            onClick={() => setFilterRoutineId(null)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            Clear filter
                        </button>
                    )}
                </div>
                <div className="h-6 w-px bg-border/50" />
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={groupByRoutine}
                        onChange={(e) => setGroupByRoutine(e.target.checked)}
                        className="rounded border-border/50"
                    />
                    <span className="text-sm font-medium text-muted-foreground">Group by Routine</span>
                </label>
            </div>

            <div className="flex-1 flex gap-6 overflow-x-auto pb-4 scrollbar-thin">
                {COLUMNS.map(col => (
                    <TaskColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        tasks={groupByRoutine ? undefined : getTasksByStatus(col.id)}
                        groupedTasks={groupByRoutine ? getGroupedTasks(col.id) : undefined}
                        focusedTaskId={focusedTaskId}
                        selectedTaskIds={selectedTaskIds}
                        subtasksByTaskId={subtasksByTaskId}
                        expandedSubtaskIds={expandedSubtaskIds}
                        onTaskClick={handleTaskClick}
                        onSubtaskClick={(taskId, subtask) => {
                            setFocusedTaskId(subtask.id)
                        }}
                        onToggleSubtask={handleSubtaskToggle}
                        onDeleteSubtask={handleSubtaskDelete}
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
                onClose={() => {
                    setIsSubtaskModalOpen(false)
                    setEditingSubtask(null)
                }}
                onSave={async (title, options) => {
                    await handleSubtaskSave(title, options)
                    setIsSubtaskModalOpen(false)
                }}
                initialTitle={editingSubtask?.subtask.title || ''}
                initialPriority={editingSubtask?.subtask.priority || 'medium'}
                initialDuration={editingSubtask?.subtask.estimated_duration_minutes || 15}
            />
        </DndContext>
    )
}
