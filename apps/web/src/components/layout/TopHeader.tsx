"use client"

import { motion } from "framer-motion"
import { Bell, Search, Plus, ChevronRight } from "lucide-react"
import { VerveLogo } from "@/components/ui/VerveLogo"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import React from "react"

// ── Types ──────────────────────────────────────────────────────
export interface ViewTab {
    id: string
    label: string
}

interface TopHeaderProps {
    title: string
    tabs?: ViewTab[]
    activeTab?: string
    onTabChange?: (id: string) => void
    actions?: React.ReactNode
    onNewTask?: () => void
    onOpenAssistant?: () => void
}

// ── Component ─────────────────────────────────────────────────
export function TopHeader({
    title,
    tabs,
    activeTab,
    onTabChange,
    actions,
    onNewTask,
    onOpenAssistant,
}: TopHeaderProps) {
    const pathname = usePathname()
    const pathSegments = pathname?.split('/').filter(Boolean) || []

    return (
        <header
            className="h-14 px-4 flex items-center justify-between bg-transparent shrink-0 w-full"
            data-purpose="top-header"
        >
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    {/* <VerveLogo className="w-4 h-4 mr-0.5" /> */}
                    <span className="cursor-pointer hover:text-foreground transition-colors">Verve</span>
                    {pathSegments.map((segment, index) => (
                        <React.Fragment key={index}>
                            <ChevronRight size={14} className="text-foreground" />
                            <span className={cn(
                                "capitalize",
                                index === pathSegments.length - 1 ? "text-foreground font-bold" : "cursor-pointer hover:text-foreground transition-colors"
                            )}>
                                {segment}
                            </span>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Right-side actions */}
            <div className="flex items-center gap-3 ml-auto">
                {/* Global search */}
                <div className="relative hidden md:flex items-center">
                    {/* <Icon
                        icon={Search}
                        size="sm"
                        className="absolute left-3 text-muted-foreground pointer-events-none"
                    /> */}
                    {/* <input
                        type="text"
                        placeholder="Search..."
                        className="h-8 w-48 pl-9 pr-3 text-sm bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:w-64 transition-all duration-200 placeholder:text-muted-foreground text-foreground"
                        data-purpose="global-search"
                    /> */}
                </div>

                {/* Notification bell */}
                <button
                    className="relative p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    data-purpose="notifications-btn"
                >
                    <Icon icon={Bell} size="sm" />
                    {/* Notification dot */}
                    <motion.span
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1 right-1 w-1.5 h-1.5 bg-destructive rounded-full"
                    />
                </button>

                {/* Slot for page-specific actions */}
                {actions}

                {/* AI assistant entry point */}
                <button
                    onClick={onOpenAssistant ?? onNewTask}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors ml-2"
                    data-purpose="assistant-open-btn"
                    title="Open AI assistant (Alt+A)"
                >
                    <Icon icon={Plus} size="sm" />
                </button>
            </div>


            {/* Row 3: View switcher tabs (optional) */}
            {tabs && tabs.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                    {tabs.map((tab) => {
                        const active = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange?.(tab.id)}
                                className={cn(
                                    "relative px-4 py-2 text-sm rounded-xl transition-colors",
                                    active
                                        ? "text-foreground bg-muted font-bold"
                                        : "text-muted-foreground font-medium hover:text-foreground hover:bg-muted"
                                )}
                            >
                                {tab.label}
                                {active && (
                                    <motion.span
                                        layoutId="tab-underline"
                                        className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-t-full"
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </header>
    )
}
