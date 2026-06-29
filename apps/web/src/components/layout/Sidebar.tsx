"use client"

import Link from "next/link"
import { VerveLogo } from "@/components/ui/VerveLogo"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    LayoutDashboard,
    Calendar,
    CheckSquare,
    Blocks,
    Settings,
    LogOut,
    User,
    Plus,
    Inbox,
    FileText,
} from "lucide-react"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// ── Types ──────────────────────────────────────────────────────
type SidebarState = "rail" | "full"

interface SidebarProps {
    userEmail: string
    userName: string
    avatarUrl: string
    onAIToggle?: () => void
}

// ── Nav config ────────────────────────────────────────────────
const NAV_MAIN = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/inbox", icon: Inbox, label: "Inbox" },
    { href: "/calendar", icon: Calendar, label: "Calendar" },
    { href: "/tasks", icon: CheckSquare, label: "Tasks" },
    { href: "/templates", icon: FileText, label: "Templates" },
    { href: "/integrations", icon: Blocks, label: "Integrations" },
]

// ── Width constants (match tailwind.config) ───────────────────
const STATE_WIDTHS: Record<SidebarState, number> = {
    rail: 56,
    full: 260,
}

export function Sidebar({ userEmail, userName, avatarUrl, onAIToggle }: SidebarProps) {
    const pathname = usePathname()

    const isActive = (href: string) =>
        pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

    return (
        <>
            <aside
                className="relative shrink-0 z-30 flex w-16 py-3"
                data-purpose="sidebar"
            >
                <div className="w-full h-full bg-transparent flex flex-col overflow-hidden relative z-10 items-center">

                    {/* ── Brand Logo ── */}
                    <div className="w-full flex justify-center items-center mt-2 shrink-0">
                        <Link
                            href="/dashboard"
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors shadow-sm border border-border"
                        >
                            <VerveLogo className="w-5 h-5" />
                        </Link>
                    </div>

                    {/* ── Main nav ── */}
                    <nav className="flex-1 px-2 mt-4 space-y-2 overflow-x-hidden overflow-y-auto scrollbar-none w-full">
                        {NAV_MAIN.map(({ href, icon, label }) => {
                            const active = isActive(href)
                            return (
                                <SidebarItem
                                    key={href}
                                    href={href}
                                    icon={icon}
                                    label={label}
                                    active={active}
                                    showLabel={false}
                                    isRail={true}
                                />
                            )
                        })}
                    </nav>

                    {/* ── Bottom User Profile Section ── */}
                    <div className="px-2 pb-2 pt-2 mt-auto shrink-0 w-full">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="w-full flex items-center justify-center h-12 rounded-xl transition-colors duration-150 group hover:bg-muted outline-none overflow-hidden">
                                    <div className="relative shrink-0 flex items-center justify-center w-8 h-8">
                                        <Image
                                            src={avatarUrl}
                                            alt={userName}
                                            width={32}
                                            height={32}
                                            className="rounded-full object-cover shadow-sm border border-border"
                                        />
                                    </div>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent side="right" align="end" sideOffset={16} className="w-56 p-1 z-50">
                                <div className="px-2 py-1.5 mb-1">
                                    <p className="text-sm font-bold truncate">{userName}</p>
                                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                                </div>
                                <div className="h-px bg-border my-1 mx-1" />
                                <Link href="/profile" className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium hover:bg-muted rounded-md text-foreground transition-colors">
                                    <Icon icon={User} size="sm" className="text-muted-foreground" />
                                    Profile
                                </Link>
                                <Link href="/settings" className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium hover:bg-muted rounded-md text-foreground transition-colors">
                                    <Icon icon={Settings} size="sm" className="text-muted-foreground" />
                                    Settings
                                </Link>
                                <div className="h-px bg-border my-1 mx-1" />
                                <a href="/api/auth/logout" className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium hover:bg-destructive/10 text-destructive rounded-md transition-colors">
                                    <Icon icon={LogOut} size="sm" />
                                    Logout
                                </a>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </aside>
        </>
    )
}

// ── SidebarItem sub-component ─────────────────────────────────
interface SidebarItemProps {
    href?: string
    icon: React.ElementType
    label: string
    active: boolean
    showLabel: boolean
    isRail: boolean
    onClick?: () => void
}

function SidebarItem({ href, icon: IconComponent, label, active, showLabel, isRail, onClick }: SidebarItemProps) {
    const base = cn(
        "relative flex items-center justify-center h-12 w-12 mx-auto rounded-2xl transition-all duration-200 group overflow-hidden",
        active
            ? "bg-card shadow-md border border-border/40"
            : "hover:bg-card hover:shadow-md hover:border-border/40"
    )

    const content = (
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center justify-center w-full h-full shrink-0">
                        <IconComponent
                            size={22}
                            strokeWidth={active ? 2.5 : 2}
                            className={cn(active ? "text-primary" : "text-muted-foreground group-hover:text-primary", "transition-colors")}
                        />
                    </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="bg-popover text-popover-foreground border border-border shadow-md">
                    {label}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )

    if (onClick) {
        return (
            <button onClick={onClick} className={base}>
                {content}
            </button>
        )
    }

    return (
        <Link href={href!} className={base}>
            {content}
        </Link>
    )
}
