"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"
import { createClient } from "@/utils/supabase/client"
import { useEffect } from "react"

export type Task = {
    id: string
    routine_id: string | null
    user_id: string
    title: string
    description: string | null
    priority: "critical" | "high" | "medium" | "low"
    status: "not_started" | "in_progress" | "completed" | "missed" | "cancelled"
    category: string | null
    scheduled_at: string | null
    estimated_duration_minutes: number
    actual_duration_minutes: number | null
    recurrence_rule: string | null
    recurrence_parent_id: string | null
    is_time_locked: boolean
    ai_context: string | null
    client_id: string | null
    target_week: number | null
    target_day: string | null
    external_provider: "google_calendar" | "gmail" | "chrome_extension" | "slack" | "outlook" | "zoom" | null
    external_id: string | null
    external_link: string | null
    source_metadata: any | null
    created_at: string
    updated_at: string
    deleted_at: string | null
}

const supabase = createClient()

export type TaskQueryParams = {
    cursor?: string
    limit?: number
    start_date?: string
    end_date?: string
}

export function useTasks(params?: TaskQueryParams) {
    return useQuery<Task[]>({
        queryKey: ["tasks", params],
        queryFn: async () => {
            return await apiClient.tasks.getTasks(params) as Task[]
        },
    })
}

export function useUpdateTask() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (updates: Partial<Task> & { id: string }) => {
            const { id, ...data } = updates
            const res = await apiClient.tasks.updateTask(id, data)
            if (!res.success) throw new Error(res.error || "Failed to update task")
            return res.data as Task
        },
        onMutate: async (updatedTask) => {
            await queryClient.cancelQueries({ queryKey: ["tasks"] })
            const previousTasksTuples = queryClient.getQueriesData<Task[]>({ queryKey: ["tasks"] })

            // Find the full task object from any query cache
            let fullTask: Task | null = null;
            for (const [_, data] of previousTasksTuples) {
                if (data) {
                    const found = data.find(t => t.id === updatedTask.id);
                    if (found) {
                        fullTask = found;
                        break;
                    }
                }
            }

            const optimisticTask = fullTask ? { ...fullTask, ...updatedTask } : null;

            if (optimisticTask) {
                queryClient.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) => {
                    if (!old) return old
                    const exists = old.some((t) => t.id === updatedTask.id)
                    if (exists) {
                        return old.map((t) => (t.id === updatedTask.id ? optimisticTask : t))
                    } else {
                        // Optimistically add to all lists. The backend re-fetch will clean up lists where it doesn't belong.
                        return [...old, optimisticTask]
                    }
                })
            }

            return { previousTasks: previousTasksTuples }
        },
        onError: (err, newTodo, context) => {
            if (context?.previousTasks) {
                for (const [queryKey, previousData] of context.previousTasks) {
                    queryClient.setQueryData(queryKey, previousData)
                }
            }
        },
        onSuccess: (task) => {
            queryClient.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) => {
                if (!old) return old
                const exists = old.some((t) => t.id === task.id)
                if (exists) {
                    return old.map((t) => (t.id === task.id ? task : t))
                }
                return old // We rely on invalidateQueries to place it in the correct lists
            })
            // Must invalidate to ensure tasks that changed lists (e.g. unscheduled -> scheduled) are correctly fetched
            queryClient.invalidateQueries({ queryKey: ["tasks"] })
        },
    })
}

export type CreateTaskPayload = {
    title: string
    scheduled_at: string
} & Partial<Omit<Task, "id" | "user_id" | "created_at" | "updated_at" | "title" | "scheduled_at">>

export function useCreateTask() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (newTask: CreateTaskPayload) => {
            const res = await apiClient.tasks.createTask(newTask)
            if (!res.success) throw new Error(res.error || "Failed to create task")
            return res.data as Task
        },
        onMutate: async (newTask) => {
            await queryClient.cancelQueries({ queryKey: ["tasks"] })
            const previousTasksTuples = queryClient.getQueriesData<Task[]>({ queryKey: ["tasks"] })
            
            // Create a temporary optimistic task
            const optimisticTask: Task = {
                id: `temp-${Date.now()}`,
                routine_id: null,
                user_id: "optimistic",
                title: newTask.title,
                description: newTask.description || null,
                priority: newTask.priority || "medium",
                status: newTask.status || "not_started",
                category: newTask.category || null,
                scheduled_at: newTask.scheduled_at || null,
                estimated_duration_minutes: newTask.estimated_duration_minutes || 30,
                actual_duration_minutes: null,
                recurrence_rule: null,
                recurrence_parent_id: null,
                is_time_locked: newTask.is_time_locked || false,
                ai_context: null,
                client_id: null,
                target_week: null,
                target_day: null,
                external_provider: null,
                external_id: null,
                external_link: null,
                source_metadata: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted_at: null,
            }

            queryClient.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) => {
                if (!old) return [optimisticTask]
                return [optimisticTask, ...old]
            })

            return { previousTasksTuples }
        },
        onError: (err, newTodo, context) => {
            if (context?.previousTasksTuples) {
                for (const [queryKey, previousData] of context.previousTasksTuples) {
                    queryClient.setQueryData(queryKey, previousData)
                }
            }
        },
        onSuccess: (task) => {
            queryClient.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) => {
                if (!old) return [task]
                return old.map((t) => (t.id.startsWith("temp-") && t.title === task.title ? task : t))
            })
            // Invalidate to ensure background sync
            queryClient.invalidateQueries({ queryKey: ["tasks"] })
        },
    })
}

export function useDeleteTask() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiClient.tasks.deleteTask(id)
            if (!res.success) throw new Error(res.error || "Failed to delete task")
            return id
        },
        onMutate: async (deletedId) => {
            await queryClient.cancelQueries({ queryKey: ["tasks"] })
            const previousTasksTuples = queryClient.getQueriesData<Task[]>({ queryKey: ["tasks"] })

            queryClient.setQueriesData<Task[]>({ queryKey: ["tasks"] }, (old) => {
                if (!old) return []
                return old.filter((t) => t.id !== deletedId)
            })

            return { previousTasksTuples }
        },
        onError: (err, newTodo, context) => {
            if (context?.previousTasksTuples) {
                for (const [queryKey, previousData] of context.previousTasksTuples) {
                    queryClient.setQueryData(queryKey, previousData)
                }
            }
        },
    })
}
