"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"
import { apiClient } from "@/utils/apiClient"

export type SyncState = {
    id: string
    user_id: string
    provider: "google" | "github" | "apple" | "microsoft"
    sync_token: string | null
    webhook_channel_id: string | null
    webhook_expiration: string | null
    last_synced_at: string | null
    created_at: string
    updated_at: string
}

export function useIntegrations() {
    const supabase = createClient()

    return useQuery<SyncState[]>({
        queryKey: ["integrations"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("calendar_sync_state")
                .select("*")

            if (error) throw error
            return data ?? []
        },
    })
}

export function useConnectIntegration() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (providerId: string) => {
            if (providerId === "google") {
                const response = await apiClient.integrations.connectGoogle()
                if (response.url) {
                    window.location.href = response.url // Redirect to OAuth flow
                }
                return response
            }
            throw new Error("Provider not yet supported in fastify backend mock.")
        },
    })
}

export function useDisconnectIntegration() {
    const supabase = createClient()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("calendar_sync_state")
                .delete()
                .eq("id", id)

            if (error) throw error
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["integrations"] })
        },
    })
}
