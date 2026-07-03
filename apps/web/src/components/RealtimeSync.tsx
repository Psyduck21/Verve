"use client"
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

/**
 * RealtimeSync — subscribes to Supabase Broadcast events emitted by the Fastify backend.
 * This decouples the client from direct Postgres CDC (postgres_changes), saving connections.
 */
export function RealtimeSync() {
    const queryClient = useQueryClient()
    const [supabase] = useState(() => createClient())
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setUserId(data.user.id)
            }
        })

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                setUserId(session.user.id)
            } else {
                setUserId(null)
            }
        })

        return () => {
            authListener.subscription.unsubscribe()
        }
    }, [supabase])

    useEffect(() => {
        if (!userId) return

        const channelName = `user_${userId}`
        const channel = supabase
            .channel(channelName)
            .on(
                "broadcast",
                { event: "task_created" },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["tasks"] })
                }
            )
            .on(
                "broadcast",
                { event: "task_updated" },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["tasks"] })
                }
            )
            .on(
                "broadcast",
                { event: "task_deleted" },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["tasks"] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [queryClient, supabase, userId])

    return null
}
