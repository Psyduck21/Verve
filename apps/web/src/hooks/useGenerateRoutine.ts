"use client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"

type GenerateRoutineInput = {
    profile: {
        grind_type: string
        wake_time: string
        sleep_time: string
        daily_commitment_minutes: number
        full_name: string
    }
    answers: unknown[]
}

export function useGenerateRoutine() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: GenerateRoutineInput) => {
            const res = await apiClient.ai.generateRoutine(input)
            if (!res.success) throw new Error(res.error || "Failed to generate routine")
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] })
        },
    })
}
