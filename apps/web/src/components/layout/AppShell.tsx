"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Sidebar } from "./Sidebar"
import { TopHeader } from "@/components/layout/TopHeader"
import { AIPanel } from "./AIPanel"
import { useTaskStore } from "@/store/useTaskStore"

const UniversalModal = dynamic(
    () => import("./UniversalModal").then((m) => m.UniversalModal),
    { ssr: false }
)

interface AppShellProps {
    children: React.ReactNode
    user?: any
}

export function AppShell({ children, user }: AppShellProps) {
    const [aiOpen, setAiOpen] = useState(false)
    const { isTaskModalOpen, modalMode, setIsTaskModalOpen, openModal } = useTaskStore()
    
    const email = user?.email || "guest@verve.app"
    const name = user?.user_metadata?.full_name || "Guest"
    const avatarUrl = user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background font-sans">
            <Sidebar
                userEmail={email}
                userName={name}
                avatarUrl={avatarUrl}
                onAIToggle={() => setAiOpen(true)}
            />
            
            <main className="flex-1 min-w-0 h-full flex flex-col relative z-0 overflow-hidden">
                <TopHeader title="Verve" onNewTask={() => openModal("task")} />
                {children}
            </main>

            <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} />
            <UniversalModal
                open={isTaskModalOpen}
                initialMode={modalMode}
                onClose={() => setIsTaskModalOpen(false)}
            />
        </div>
    )
}
