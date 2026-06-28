"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, BellOff, Check, X, Trash2 } from "lucide-react"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"
import { useNotifications, useMarkNotificationRead } from "@/hooks/useNotifications"
import type { Notification } from "@/hooks/useNotifications"

interface NotificationPanelProps {
    className?: string
}

export function NotificationPanel({ className }: NotificationPanelProps) {
    const { data: notifications = [] } = useNotifications()
    const markAsRead = useMarkNotificationRead()

    const [isSubscribed, setIsSubscribed] = useState(false)

    useEffect(() => {
        // Check if user has push notification subscription
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.pushManager.getSubscription().then((subscription) => {
                    setIsSubscribed(!!subscription)
                })
            })
        }
    }, [])

    const handleSubscribe = async () => {
        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            })
            // Call API to save subscription
            setIsSubscribed(true)
        } catch (error) {
            console.error("Failed to subscribe:", error)
        }
    }

    const handleUnsubscribe = async () => {
        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            if (subscription) {
                await subscription.unsubscribe()
                // Call API to remove subscription
                setIsSubscribed(false)
            }
        } catch (error) {
            console.error("Failed to unsubscribe:", error)
        }
    }

    const handleMarkRead = (id: string) => {
        markAsRead.mutate(id)
    }

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return "Just now"
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        return `${diffDays}d ago`
    }

    return (
        <div className={cn("flex flex-col h-full bg-card border-r border-border", className)}>
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Icon icon={Bell} size="sm" className="text-primary" />
                        Notifications
                    </h2>
                    <button
                        onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
                        className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            isSubscribed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                        title={isSubscribed ? "Disable notifications" : "Enable notifications"}
                    >
                        <Icon icon={isSubscribed ? Bell : BellOff} size="sm" />
                    </button>
                </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {notifications.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        {isSubscribed ? "No notifications yet." : "Enable notifications to stay updated."}
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn(
                                "group relative p-3 rounded-xl border transition-all",
                                notification.status === "pending" 
                                    ? "bg-primary/5 border-primary/20" 
                                    : "bg-muted/30 border-border"
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-medium text-foreground">
                                        {notification.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {notification.body}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-muted-foreground">
                                            {formatTime(notification.created_at)}
                                        </span>
                                        <span className={cn(
                                            "text-xs px-1.5 py-0.5 rounded",
                                            notification.status === "pending" 
                                                ? "bg-primary/10 text-primary" 
                                                : "bg-muted text-muted-foreground"
                                        )}>
                                            {notification.status}
                                        </span>
                                    </div>
                                </div>
                                {notification.status === "pending" && (
                                    <button
                                        onClick={() => handleMarkRead(notification.id)}
                                        className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                        title="Mark as read"
                                    >
                                        <Icon icon={Check} size="sm" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    )
}
