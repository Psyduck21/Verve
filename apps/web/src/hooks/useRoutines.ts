"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

export type Routine = {
    id: string
    user_id: string
    title: string
    goal: string | null
    is_active: boolean
    sort_order: number
    ai_generated_at: string | null
    ai_model_used: string | null
    ai_prompt_version: number
    client_id: string | null
    created_at: string
    updated_at: string
    deleted_at: string | null
}

export function useRoutines() {
    const supabase = createClient()

    return useQuery<Routine[]>({
        queryKey: ["routines"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("routines")
                .select("*")
                .is("deleted_at", null)
                .order("sort_order", { ascending: true })

            if (error) throw error
            return data ?? []
        },
    })
}

export function useCreateRoutine() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (newRoutine: Pick<Routine, "title" | "goal">) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            const { data, error } = await supabase
                .from("routines")
                .insert({ ...newRoutine, user_id: user.id })
                .select()
                .single()

            if (error) throw error
            return data as Routine
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["routines"] })
        },
    })
}

export function useUpdateRoutine() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (updates: Partial<Routine> & { id: string }) => {
            const { id, ...data } = updates
            const { error } = await supabase
                .from("routines")
                .update(data)
                .eq("id", id)
            if (error) throw error
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
