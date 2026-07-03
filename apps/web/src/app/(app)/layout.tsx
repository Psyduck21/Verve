import { AppShell } from "@/components/layout/AppShell"
import dynamic from "next/dynamic"
import { getCurrentUser } from "@/utils/auth"

// P2-C: Lazy-load non-critical layout components so they don't bloat the
// initial JS payload on every page load. Both are invisible on first render.
const RealtimeSync = dynamic(
    () => import("@/components/RealtimeSync").then(m => m.RealtimeSync)
)
const KeyboardHelpOverlay = dynamic(
    () => import("@/components/KeyboardHelpOverlay").then(m => m.KeyboardHelpOverlay)
)

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // P3-A: Uses React cache() — only one Supabase call per request even if
    // individual pages also call getCurrentUser().
    const user = await getCurrentUser()

    return (
        <>
            <RealtimeSync />
            <KeyboardHelpOverlay />
            <AppShell user={user}>{children}</AppShell>
        </>
    )
}
