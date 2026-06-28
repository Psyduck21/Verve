"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"

export type TimeBlock = {
    id: string
    user_id: string
    label: string | null
    description: string | null
    start_time: string
    end_time: string
    task_id: string | null
    color: string | null
    created_at: string
    updated_at: string
}

export type CreateTimeBlockInput = {
    label: string
    description?: string
    start_time: string
    end_time: string
    task_id?: string
    color?: string
}

export function useTimeblocks(filters?: { start_date?: string; end_date?: string; task_id?: string }) {
    return useQuery<TimeBlock[]>({
        queryKey: ["timeblocks", filters],
        queryFn: async () => {
            const res = await apiClient.timeblocks.list(filters)
            if (!res.success) throw new Error(res.error || "Failed to fetch timeblocks")
            return res.data as TimeBlock[]
        },
    })
}

export function useCreateTimeblock() {
    const queryClient = useQueryClient()

    return useMutation<TimeBlock, Error, CreateTimeBlockInput>({
        mutationFn: async (data: CreateTimeBlockInput) => {
            const res = await apiClient.timeblocks.create(data)
            if (!res.success) throw new Error(res.error || "Failed to create timeblock")
            return res.data as TimeBlock
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timeblocks"] })
        },
    })
}

export function useUpdateTimeblock() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<TimeBlock>) => {
            const res = await apiClient.timeblocks.update(id, data)
            if (!res.success) throw new Error(res.error || "Failed to update timeblock")
            return res.data as TimeBlock
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timeblocks"] })
        },
    })
}

export function useDeleteTimeblock() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiClient.timeblocks.delete(id)
            if (!res.success) throw new Error(res.error || "Failed to delete timeblock")
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timeblocks"] })
        },
    })
}

export function useConvertTimeblockToTask() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiClient.timeblocks.convertToTask(id)
            if (!res.success) throw new Error(res.error || "Failed to convert timeblock to task")
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timeblocks"] })
            queryClient.invalidateQueries({ queryKey: ["tasks"] })
        },
    })
}
