"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"

export type Routine = {
    id: string
    user_id: string
    title: string
    goal: string | null
    icon?: string | null
    color: string
    is_active: boolean
    is_default: boolean
    sort_order: number
    ai_generated_at: string | null
    ai_model_used: string | null
    ai_prompt_version: number
    client_id: string | null
    created_at: string
    updated_at: string
    deleted_at: string | null
    task_count?: number
}

export function useRoutines() {
    return useQuery<Routine[]>({
        queryKey: ["routines"],
        queryFn: async () => {
            const res = await apiClient.routines.getRoutines()
            if (!res.success) throw new Error(res.error || "Failed to fetch routines")
            return res.data as Routine[]
        },
    })
}

export function useCreateRoutine() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (newRoutine: Pick<Routine, "title" | "goal">) => {
            const res = await apiClient.routines.createRoutine({
                title: newRoutine.title,
                goal: newRoutine.goal || undefined,
            })
            if (!res.success) throw new Error(res.error || "Failed to create routine")
            return res.data as Routine
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["routines"] })
        },
    })
}

export function useUpdateRoutine() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (updates: Partial<Routine> & { id: string }) => {
            const { id, ...data } = updates
            const res = await apiClient.routines.updateRoutine(id, data)
            if (!res.success) throw new Error(res.error || "Failed to update routine")
            return updates
        },
        onMutate: async (updatedRoutine) => {
            await queryClient.cancelQueries({ queryKey: ["routines"] })
            const previousRoutines = queryClient.getQueryData<Routine[]>(["routines"])

            queryClient.setQueryData<Routine[]>(["routines"], (old) => {
                if (!old) return []
                return old.map((r) => (r.id === updatedRoutine.id ? { ...r, ...updatedRoutine } : r))
            })

            return { previousRoutines }
        },
        onError: (err, newTodo, context) => {
            if (context?.previousRoutines) {
                queryClient.setQueryData(["routines"], context.previousRoutines)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["routines"] })
        },
    })
}

export function useDeleteRoutine() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiClient.routines.deleteRoutine(id)
            if (!res.success) throw new Error(res.error || "Failed to delete routine")
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["routines"] })
            queryClient.invalidateQueries({ queryKey: ["tasks"] })
        },
    })
}
