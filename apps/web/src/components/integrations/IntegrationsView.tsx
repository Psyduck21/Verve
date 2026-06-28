"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Mail, Calendar as CalendarIcon, Video, CreditCard, GitBranch, MessageSquare, CheckCircle2 } from "lucide-react"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"

const INTEGRATIONS = [
    { id: "google",     name: "Google Calendar",   description: "Sync your events and meetings",    icon: CalendarIcon, color: "text-red-500",    requiresExtension: false },
    { id: "gmail",      name: "Gmail",             description: "Turn emails into tasks",           icon: Mail,         color: "text-red-400",    requiresExtension: true },
    { id: "microsoft",  name: "Microsoft 365",     description: "Sync Outlook and Teams",           icon: CalendarIcon, color: "text-blue-500",   requiresExtension: false },
    { id: "zoom",       name: "Zoom",              description: "Auto-generate meeting links",      icon: Video,        color: "text-blue-400",   requiresExtension: true },
    { id: "stripe",     name: "Stripe",            description: "Track invoices in Unified Inbox",  icon: CreditCard,   color: "text-indigo-500", requiresExtension: true },
    { id: "github",     name: "GitHub",            description: "Link PRs to tasks",                icon: GitBranch,    color: "text-foreground", requiresExtension: true },
    { id: "slack",      name: "Slack",             description: "Send notifications to channels",   icon: MessageSquare,color: "text-pink-500",   requiresExtension: true },
]

import { useIntegrations, useConnectIntegration, useDisconnectIntegration } from "@/hooks/useIntegrations"

export default function IntegrationsView() {
    const { data: syncStates = [] } = useIntegrations()
    const connectMutation = useConnectIntegration()
    const disconnectMutation = useDisconnectIntegration()
    
    const queryClient = useQueryClient()
    const { data: profileResponse } = useQuery({
        queryKey: ["profile"],
        queryFn: apiClient.users.getProfile
    })
    
    const updatePreferences = useMutation({
        mutationFn: apiClient.users.updatePreferences,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profile"] })
        }
    })

    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [isExtensionInstalled, setIsExtensionInstalled] = useState(false)

    useEffect(() => {
        // Detect Chrome extension
        if (typeof window !== "undefined" && (window as any).__VERVE_EXTENSION_INSTALLED__) {
            setIsExtensionInstalled(true)
        }
    }, [])

    const preferences = profileResponse?.data?.preferences || {}
    const extensionIntegrations = preferences.extension_integrations || {}

    const toggleConnection = async (integration: any, activeState?: any) => {
        setLoadingId(integration.id)
        try {
            if (integration.requiresExtension) {
                if (!isExtensionInstalled) {
                    // Open dummy download link
                    window.open("https://chrome.google.com/webstore", "_blank")
                    return
                }
                
                // Toggle extension integration preference
                const currentVal = !!extensionIntegrations[integration.id]
                await updatePreferences.mutateAsync({
                    preferences: {
                        ...preferences,
                        extension_integrations: {
                            ...extensionIntegrations,
                            [integration.id]: !currentVal
                        }
                    }
                })
            } else {
                // OAuth backend integration
                if (activeState?.id) {
                    await disconnectMutation.mutateAsync(activeState.id)
                } else {
                    await connectMutation.mutateAsync(integration.id)
                }
            }
        } catch (error) {
            console.error("Failed to toggle integration", error)
        } finally {
            setLoadingId(null)
        }
    }

    return (
        <div className="flex flex-col h-full w-full bg-transparent" data-purpose="integrations-page">
            <div className="flex-1 bg-card rounded-tl-[32px] border-t border-border flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {INTEGRATIONS.map((integration, i) => {
                        const activeState = syncStates.find(s => s.provider === integration.id)
                        let isConnected = !!activeState
                        
                        if (integration.requiresExtension) {
                            isConnected = !!extensionIntegrations[integration.id]
                        }
                        
                        const isDisabled = loadingId === integration.id || (!integration.requiresExtension && integration.id !== "google" && !isConnected)
                        
                        let buttonText = "Connect"
                        if (loadingId === integration.id) buttonText = "Processing..."
                        else if (isConnected) buttonText = "Disconnect"
                        else if (integration.requiresExtension && !isExtensionInstalled) buttonText = "Download Extension"
                        else if (!integration.requiresExtension && integration.id !== "google") buttonText = "Coming Soon"
                        
                        return (
                        <div
                            key={integration.id}
                            className="bg-card border border-border p-5 rounded-2xl shadow-island flex flex-col gap-4"
                        >
                            <div className="flex items-start justify-between">
                                <div className={cn("p-2.5 rounded-xl bg-muted border border-border", integration.color)}>
                                    <Icon icon={integration.icon} size="md" />
                                </div>
                                {isConnected ? (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 rounded-full">
                                        <Icon icon={CheckCircle2} size="sm" />
                                        Connected
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full border border-border">
                                        Not connected
                                    </span>
                                )}
                            </div>

                            <div>
                                <h3 className="text-base font-semibold text-foreground">{integration.name}</h3>
                                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{integration.description}</p>
                            </div>

                            <button
                                onClick={() => toggleConnection(integration, activeState)}
                                disabled={isDisabled}
                                className={cn(
                                    "mt-2 w-full py-2 text-sm font-medium rounded-xl transition-all border",
                                    isDisabled && "opacity-50 cursor-not-allowed",
                                    isConnected
                                        ? "bg-background text-destructive border-destructive hover:bg-destructive/10"
                                        : "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                )}
                            >
                                {buttonText}
                            </button>
                        </div>
                    )})}
                </div>
            </div>
            </div>
        </div>
    )
}
