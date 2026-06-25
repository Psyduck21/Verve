"use client"

import { useState, useEffect } from "react"
import { Icon } from "@/components/ui/Icon"
import { User, Bell, Palette, Shield, CreditCard, Sparkles, Upload, Sun, Moon, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"

import { Keyboard } from "lucide-react"

const SETTINGS_TABS = [
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "shortcuts", label: "Command Palette", icon: Keyboard },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "ai", label: "AI Assistant", icon: Sparkles },
    { id: "security", label: "Security", icon: Shield },
    { id: "billing", label: "Billing", icon: CreditCard },
]

export default function SettingsView() {
    const [activeTab, setActiveTab] = useState("appearance")
    const { theme, setTheme } = useTheme()
    const queryClient = useQueryClient()

    const { data: userProfileData, isLoading } = useQuery({
        queryKey: ['userProfile'],
        queryFn: apiClient.users.getProfile,
    })

    const updatePreferencesMutation = useMutation({
        mutationFn: async (prefs: any) => {
            return apiClient.users.updatePreferences({ preferences: prefs })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] })
        }
    })

    const userPreferences = userProfileData?.data?.preferences || {}
    const defaultHotkeys = {
        'nav_dashboard': 'g d',
        'nav_calendar': 'g c',
        'nav_tasks': 'g t',
        'action_create_task': 'c',
        'action_auto_schedule': 'cmd+s',
    }
    const hotkeys = userPreferences.hotkeys || defaultHotkeys
    const disabledCommands = userPreferences.disabled_commands || []

    const handleUpdateHotkey = (commandId: string, newKey: string) => {
        const updatedHotkeys = { ...hotkeys, [commandId]: newKey }
        updatePreferencesMutation.mutate({
            ...userPreferences,
            hotkeys: updatedHotkeys
        })
    }

    const toggleCommand = (commandId: string) => {
        const updatedDisabled = disabledCommands.includes(commandId)
            ? disabledCommands.filter((id: string) => id !== commandId)
            : [...disabledCommands, commandId]
        updatePreferencesMutation.mutate({
            ...userPreferences,
            disabled_commands: updatedDisabled
        })
    }

    const requestNotificationPermission = async () => {
        try {
            const permission = await Notification.requestPermission()
            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BN5LT8CCL_A7gJRmJmm8hswL5Hpz8CZpGZdfjuXcQly7Xl3KiMgwuRKMXgn7PstaoTKPazvnBcMv1Sy1KmIfdMQ"
                })
                
                await apiClient.notifications.registerPushSubscription({
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh') as ArrayBuffer)))),
                        auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth') as ArrayBuffer))))
                    },
                    browser: navigator.userAgent
                })
                alert('Notifications enabled successfully!')
            } else {
                alert('Notification permission denied.')
            }
        } catch (error) {
            console.error('Error subscribing to notifications:', error)
            alert('Failed to enable notifications. See console.')
        }
    }

    return (
        <div className="flex flex-col h-full w-full bg-transparent" data-purpose="settings-page">
            <div className="flex-1 bg-card rounded-tl-[32px] border-t border-border flex flex-col overflow-hidden">
                <div className="flex-1 p-8 flex flex-col md:flex-row gap-8 items-start scrollbar-thin">
                    {/* ── Settings Sidebar ── */}
                    <aside className="w-full md:w-64 shrink-0 space-y-1 h-full overflow-y-auto pr-2">
                        {SETTINGS_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-colors",
                                    activeTab === tab.id
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Icon icon={tab.icon as any} className={cn("h-4 w-4", activeTab === tab.id ? "text-primary" : "text-muted-foreground")} />
                                {tab.label}
                            </button>
                        ))}
                    </aside>

                    {/* ── Settings Content ── */}
                    <div className="flex-1 max-w-4xl h-full overflow-y-auto pb-24 pr-4">


                        {activeTab === "notifications" && (
                            <div className="space-y-8 max-w-2xl animate-fade-in-up">
                                <div>
                                    <h2 className="text-xl font-semibold text-foreground">Notification Preferences</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Manage how and when you receive alerts.</p>
                                </div>
                                <div className="p-4 border rounded-xl bg-card flex flex-col gap-4">
                                    <h3 className="font-medium text-foreground">Browser Push Notifications</h3>
                                    <p className="text-sm text-muted-foreground">Receive reminders for your scheduled tasks directly on your device.</p>
                                    <button 
                                        onClick={requestNotificationPermission}
                                        className="self-start px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg"
                                    >
                                        Enable Notifications
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === "appearance" && (
                            <div className="space-y-8 max-w-2xl animate-fade-in-up">
                                <div>
                                    <h2 className="text-xl font-semibold text-foreground">Appearance Settings</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Customize how the application looks on your device.</p>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-foreground">Interface Theme</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <button
                                            onClick={() => setTheme('light')}
                                            className={cn(
                                                "flex flex-col items-start gap-3 p-4 rounded-xl border text-left transition-all",
                                                theme === 'light'
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                                                    : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
                                            )}
                                        >
                                            <div className="p-2 rounded-lg bg-background shadow-sm border border-border">
                                                <Sun className="h-5 w-5 text-foreground" />
                                            </div>
                                            <div>
                                                <span className="block text-sm font-medium text-foreground">Light Mode</span>
                                                <span className="block text-xs text-muted-foreground mt-0.5">Clear and bright</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setTheme('dark')}
                                            className={cn(
                                                "flex flex-col items-start gap-3 p-4 rounded-xl border text-left transition-all",
                                                theme === 'dark'
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                                                    : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
                                            )}
                                        >
                                            <div className="p-2 rounded-lg bg-background shadow-sm border border-border">
                                                <Moon className="h-5 w-5 text-foreground" />
                                            </div>
                                            <div>
                                                <span className="block text-sm font-medium text-foreground">Dark Mode</span>
                                                <span className="block text-xs text-muted-foreground mt-0.5">Easy on the eyes</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setTheme('system')}
                                            className={cn(
                                                "flex flex-col items-start gap-3 p-4 rounded-xl border text-left transition-all",
                                                theme === 'system'
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                                                    : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
                                            )}
                                        >
                                            <div className="p-2 rounded-lg bg-background shadow-sm border border-border">
                                                <Monitor className="h-5 w-5 text-foreground" />
                                            </div>
                                            <div>
                                                <span className="block text-sm font-medium text-foreground">System</span>
                                                <span className="block text-xs text-muted-foreground mt-0.5">Follow OS settings</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "shortcuts" && (
                            <div className="space-y-8 max-w-2xl animate-fade-in-up">
                                <div>
                                    <h2 className="text-xl font-semibold text-foreground">Command Palette & Shortcuts</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Customize global hotkeys and command visibility for a no-mouse workflow.</p>
                                </div>
                                <div className="space-y-4">
                                    {Object.entries(defaultHotkeys).map(([commandId, defaultKey]) => {
                                        const currentKey = hotkeys[commandId] || defaultKey;
                                        const isEnabled = !disabledCommands.includes(commandId);
                                        return (
                                            <div key={commandId} className="flex items-center justify-between p-4 bg-card border rounded-xl">
                                                <div>
                                                    <p className="font-medium text-sm text-foreground">{commandId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Toggle visibility or change hotkey</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <input 
                                                        type="text" 
                                                        value={currentKey} 
                                                        onChange={(e) => handleUpdateHotkey(commandId, e.target.value.toLowerCase())}
                                                        className="w-24 text-center px-2 py-1 text-xs border rounded-md bg-muted uppercase"
                                                    />
                                                    <button 
                                                        onClick={() => toggleCommand(commandId)}
                                                        className={cn("px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border", isEnabled ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground")}
                                                    >
                                                        {isEnabled ? 'Enabled' : 'Disabled'}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {activeTab !== "shortcuts" && activeTab !== "appearance" && activeTab !== "notifications" && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <Icon icon={SETTINGS_TABS.find(t => t.id === activeTab)?.icon as any} size="lg" className="text-muted-foreground/30 mb-4" />
                                <h2 className="text-xl font-semibold text-foreground capitalize mb-2">{activeTab} Settings</h2>
                                <p className="text-sm text-muted-foreground max-w-sm">
                                    Configuration options for {activeTab} will appear here.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
