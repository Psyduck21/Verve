"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"
import { createClient } from "@/utils/supabase/client"
import { useEffect } from "react"

export type Task = {
    id: string
    routine_id: string
    user_id: string
    title: string
    description: string | null
    priority: "critical" | "high" | "medium" | "low"
    status: "not_started" | "in_progress" | "completed" | "missed" | "cancelled"
    category: string | null
    scheduled_at: string
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

export function useTasks() {
    const queryClient = useQueryClient()

    useEffect(() => {
        const channelId = `realtime-tasks-${Math.random()}`
        const channel = supabase.channel(channelId)
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks' },
            () => {
                queryClient.invalidateQueries({ queryKey: ["tasks"] })
            }
        ).subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [queryClient])

    return useQuery<Task[]>({
        queryKey: ["tasks"],
        queryFn: async () => {
            return await apiClient.tasks.getTasks() as Task[]
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
            const previousTasks = queryClient.getQueryData<Task[]>(["tasks"])

            queryClient.setQueryData<Task[]>(["tasks"], (old) => {
                if (!old) return []
                return old.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
            })

            return { previousTasks }
        },
        onError: (err, newTodo, context) => {
            if (context?.previousTasks) {
                queryClient.setQueryData(["tasks"], context.previousTasks)
            }
        },
        onSettled: () => {
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
        onSuccess: () => {
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
            const previousTasks = queryClient.getQueryData<Task[]>(["tasks"])

            queryClient.setQueryData<Task[]>(["tasks"], (old) => {
                if (!old) return []
                return old.filter((t) => t.id !== deletedId)
            })

            return { previousTasks }
        },
        onError: (err, newTodo, context) => {
            if (context?.previousTasks) {
                queryClient.setQueryData(["tasks"], context.previousTasks)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] })
        },
    })
}
