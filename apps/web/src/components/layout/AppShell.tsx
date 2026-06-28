"use client"

import { useEffect } from "react"
import dynamic from "next/dynamic"
import { Sidebar } from "./Sidebar"
import { TopHeader } from "@/components/layout/TopHeader"
import { Toaster } from "@/components/ui/toaster"
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
    const { isTaskModalOpen, modalMode, setIsTaskModalOpen, openModal } = useTaskStore()

    useEffect(() => {
        const handleOpenAi = () => openModal("ai")
        window.addEventListener("open_ai_assistant", handleOpenAi)
        window.addEventListener("open_ai_omnibox", handleOpenAi)
        return () => {
            window.removeEventListener("open_ai_assistant", handleOpenAi)
            window.removeEventListener("open_ai_omnibox", handleOpenAi)
        }
    }, [openModal])

    const email = user?.email || "guest@verve.app"
    const name = user?.user_metadata?.full_name || "Guest"
    const avatarUrl = user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background font-sans">
            <Sidebar
                userEmail={email}
                userName={name}
                avatarUrl={avatarUrl}
                onAIToggle={() => openModal("ai")}
            />
            
            <main className="flex-1 min-w-0 h-full flex flex-col relative z-0 overflow-hidden">
                <TopHeader 
                    title="Verve"
                    onNewTask={() => openModal("task")}
                    onOpenAssistant={() => openModal("ai")}
                />
                {children}
            </main>

            <UniversalModal
                open={isTaskModalOpen}
                initialMode={modalMode}
                onClose={() => setIsTaskModalOpen(false)}
            />
            <Toaster />
        </div>
    )
}
