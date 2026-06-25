"use client"
import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

/**
 * RealtimeSync — subscribes to Supabase Realtime for the `tasks` table.
 * On any change (INSERT / UPDATE / DELETE), invalidates the tasks query
 * so TanStack Query refetches fresh data.
 */
export function RealtimeSync() {
    const queryClient = useQueryClient()
    const supabase = createClient()

    useEffect(() => {
        const channel = supabase
            .channel("verve-realtime")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "tasks" },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["tasks"] })
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "routines" },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["routines"] })
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "calendar_sync_state" },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["integrations"] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [queryClient, supabase])

    return null
}
