import { AppShell } from "@/components/layout/AppShell"
import { RealtimeSync } from "@/components/RealtimeSync"
import { KeyboardHelpOverlay } from "@/components/KeyboardHelpOverlay"
import { createClient } from "@/utils/supabase/server"

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <>
            <RealtimeSync />
            <KeyboardHelpOverlay />
            <AppShell user={user}>{children}</AppShell>
        </>
    )
}
