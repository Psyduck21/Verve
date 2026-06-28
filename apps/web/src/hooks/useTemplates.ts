"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"

export type Template = {
  id: string
  user_id: string
  name: string
  description?: string | null
  default_priority: string
  default_category: string | null
  default_duration_minutes: number
  is_public: boolean
  is_default: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export function useTemplates() {
    return useQuery<Template[]>({
        queryKey: ["templates"],
        queryFn: async () => {
            const res = await apiClient.templates.list()
            if (!res.success) throw new Error(res.error || "Failed to fetch templates")
            return res.data as Template[]
        },
    })
}

export function useCreateTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (newTemplate: Pick<Template, "name" | "description">) => {
            const res = await apiClient.templates.create({
                name: newTemplate.name,
                description: newTemplate.description || undefined,
            })
            if (!res.success) throw new Error(res.error || "Failed to create template")
            return res.data as Template
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["templates"] })
        },
    })
}

export function useUpdateTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (updates: Partial<Template> & { id: string }) => {
            const { id, ...data } = updates
            const res = await apiClient.templates.update(id, data)
            if (!res.success) throw new Error(res.error || "Failed to update template")
            return updates
        },
        onMutate: async (updatedTemplate) => {
            await queryClient.cancelQueries({ queryKey: ["templates"] })
            const previousTemplates = queryClient.getQueryData<Template[]>(["templates"])

            queryClient.setQueryData<Template[]>(["templates"], (old) => {
                if (!old) return []
                return old.map((r) => (r.id === updatedTemplate.id ? { ...r, ...updatedTemplate } : r))
            })

            return { previousTemplates }
        },
        onError: (err, newTodo, context) => {
            if (context?.previousTemplates) {
                queryClient.setQueryData(["templates"], context.previousTemplates)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["templates"] })
        },
    })
}

export function useDeleteTemplate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiClient.templates.delete(id)
            if (!res.success) throw new Error(res.error || "Failed to delete template")
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["templates"] })
            queryClient.invalidateQueries({ queryKey: ["tasks"] })
        },
    })
}
