"use client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

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
            const response = await fetch("/api/ai/generate-routine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message ?? "Failed to generate routine")
            }
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] })
        },
    })
}
