"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"

export type Notification = {
    id: string
    user_id: string
    type: string
    title: string
    body: string
    scheduled_at: string
    sent_at: string | null
    status: "pending" | "sent" | "failed"
    created_at: string
    updated_at: string
}

export function useNotifications() {
    return useQuery<Notification[]>({
        queryKey: ["notifications"],
        queryFn: async () => {
            const res = await apiClient.notifications.getHistory()
            if (!res.success) throw new Error(res.error || "Failed to fetch notifications")
            return res.data || []
        },
    })
}

export function useSubscribeNotification() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: { endpoint: string; keys: { p256dh: string; auth: string }; browser?: string }) => {
            const res = await apiClient.notifications.registerPushSubscription(data)
            if (!res.success) throw new Error(res.error || "Failed to subscribe")
            return res
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
        },
    })
}

export function useUnsubscribeNotification() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (endpoint: string) => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/notifications/unsubscribe`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint }),
            })
            if (!res.ok) throw new Error("Failed to unsubscribe")
            return res
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
        },
    })
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const res = await apiClient.notifications.markAsRead(id)
            if (!res.success) throw new Error(res.error || "Failed to mark as read")
            return res
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
        },
    })
}
