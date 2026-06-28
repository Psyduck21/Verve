"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"

export type Category = {
    id: string
    user_id: string
    name: string
    color: string
    created_at: string
    updated_at: string
}

export function useCategories() {
    return useQuery<Category[]>({
        queryKey: ["categories"],
        queryFn: async () => {
            const res = await apiClient.categories.getCategories()
            return res.data || []
        },
    })
}

export function useCreateCategory() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: { name: string; color?: string }) => {
            const res = await apiClient.categories.createCategory(data)
            if (!res.success) throw new Error(res.error || "Failed to create category")
            return res.data as Category
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] })
        },
    })
}

export function useUpdateCategory() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<Category>) => {
            const res = await apiClient.categories.updateCategory(id, data)
            if (!res.success) throw new Error(res.error || "Failed to update category")
            return res.data as Category
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] })
        },
    })
}

export function useDeleteCategory() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiClient.categories.deleteCategory(id)
            if (!res.success) throw new Error(res.error || "Failed to delete category")
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["categories"] })
        },
    })
}
