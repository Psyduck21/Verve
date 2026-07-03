"use client"

import { useState, useEffect } from "react"
import { Upload } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileView() {
    const queryClient = useQueryClient()

    const { data: userProfileData, isLoading } = useQuery({
        queryKey: ['userProfile'],
        queryFn: apiClient.users.getProfile,
    })

    const [profile, setProfile] = useState({
        name: "",
        email: "",
        role: "",
        wakeTime: "",
        sleepTime: "",
        dailyCommitment: 120,
        focusAreas: "",
        priorityPref: "",
        aiUsed: 0,
        aiLimit: 0,
    })

    useEffect(() => {
        if (userProfileData?.data) {
            const data = userProfileData.data
            setProfile({
                name: data.full_name || "",
                email: data.email || "",
                role: data.grind_type || "",
                wakeTime: data.wake_time || "09:00:00",
                sleepTime: data.sleep_time || "22:00:00",
                dailyCommitment: data.daily_commitment_minutes || 120,
                focusAreas: Array.isArray(data.primary_focus_areas) ? data.primary_focus_areas.join(", ") : "",
                priorityPref: data.priority_preference || "balanced",
                aiUsed: data.ai_requests_used_today || 0,
                aiLimit: data.ai_request_limit || 50,
            })
        }
    }, [userProfileData])

    const updateProfileMutation = useMutation({
        mutationFn: async (newProfile: any) => {
            return apiClient.users.updatePreferences(newProfile)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userProfile'] })
            alert('Profile updated successfully!')
        }
    })

    const handleSaveProfile = () => {
        updateProfileMutation.mutate({
            full_name: profile.name,
            grind_type: profile.role,
            wake_time: profile.wakeTime.length === 5 ? `${profile.wakeTime}:00` : profile.wakeTime,
            sleep_time: profile.sleepTime.length === 5 ? `${profile.sleepTime}:00` : profile.sleepTime,
            daily_commitment_minutes: Number(profile.dailyCommitment),
            primary_focus_areas: profile.focusAreas.split(",").map(s => s.trim()).filter(Boolean),
            priority_preference: profile.priorityPref
        })
    }

    return (
        <div className="flex flex-col h-full w-full bg-transparent" data-purpose="profile-page">
            <div className="flex-1 bg-card rounded-tl-[32px] border-t border-border flex flex-col overflow-hidden">
                <div className="flex-1 p-8 overflow-y-auto scrollbar-thin">
                    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">Profile Settings</h2>
                            <p className="text-sm text-muted-foreground mt-1">Manage your public profile and personal details.</p>
                        </div>

                        {/* AI Quota */}
                        <div className="p-4 border border-border rounded-lg bg-background/50">
                            <p className="text-sm font-medium text-foreground">AI Requests</p>
                            {isLoading ? (
                                <Skeleton className="h-4 w-32 mt-2" />
                            ) : (
                                <p className="text-xs text-muted-foreground mt-1">{profile.aiUsed} of {profile.aiLimit} used today</p>
                            )}
                        </div>

                        {/* Avatar Upload */}
                        <div className="flex items-center gap-6 pb-6 border-b border-border/50">
                            {isLoading ? (
                                <Skeleton className="h-20 w-20 rounded-full" />
                            ) : (
                                <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary text-2xl font-bold shadow-sm">
                                    {profile.name.charAt(0) || 'U'}
                                </div>
                            )}
                            <div className="space-y-2">
                                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors">
                                    <Upload className="h-4 w-4" />
                                    Upload new avatar
                                </button>
                                <p className="text-xs text-muted-foreground">JPG, GIF or PNG. 1MB max.</p>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="space-y-5">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-foreground">Full Name</label>
                                {isLoading ? (
                                    <Skeleton className="h-9 w-full rounded-lg" />
                                ) : (
                                    <input
                                        type="text"
                                        value={profile.name}
                                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                )}
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-foreground">Email Address</label>
                                {isLoading ? (
                                    <Skeleton className="h-9 w-full rounded-lg" />
                                ) : (
                                    <input
                                        type="email"
                                        value={profile.email}
                                        disabled
                                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground cursor-not-allowed"
                                    />
                                )}
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-foreground">Grind Type (Role)</label>
                                {isLoading ? (
                                    <Skeleton className="h-9 w-full rounded-lg" />
                                ) : (
                                    <input
                                        type="text"
                                        value={profile.role}
                                        onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-foreground">Wake Time</label>
                                    {isLoading ? (
                                        <Skeleton className="h-9 w-full rounded-lg" />
                                    ) : (
                                        <input
                                            type="time"
                                            value={profile.wakeTime.substring(0,5)}
                                            onChange={(e) => setProfile({ ...profile, wakeTime: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium text-foreground">Sleep Time</label>
                                    {isLoading ? (
                                        <Skeleton className="h-9 w-full rounded-lg" />
                                    ) : (
                                        <input
                                            type="time"
                                            value={profile.sleepTime.substring(0,5)}
                                            onChange={(e) => setProfile({ ...profile, sleepTime: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-foreground">Daily Commitment (Minutes)</label>
                                {isLoading ? (
                                    <Skeleton className="h-9 w-full rounded-lg" />
                                ) : (
                                    <input
                                        type="number"
                                        min="15"
                                        step="15"
                                        value={profile.dailyCommitment}
                                        onChange={(e) => setProfile({ ...profile, dailyCommitment: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                )}
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-foreground">Primary Focus Areas</label>
                                {isLoading ? (
                                    <Skeleton className="h-9 w-full rounded-lg" />
                                ) : (
                                    <input
                                        type="text"
                                        value={profile.focusAreas}
                                        placeholder="Work, Health, Learning (comma separated)"
                                        onChange={(e) => setProfile({ ...profile, focusAreas: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                )}
                            </div>

                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-foreground">Priority Preference</label>
                                {isLoading ? (
                                    <Skeleton className="h-9 w-full rounded-lg" />
                                ) : (
                                    <select
                                        value={profile.priorityPref}
                                        onChange={(e) => setProfile({ ...profile, priorityPref: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="balanced">Balanced</option>
                                        <option value="urgent_first">Urgent First</option>
                                        <option value="important_first">Important First</option>
                                    </select>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                                onClick={handleSaveProfile}
                                disabled={updateProfileMutation.isPending}
                                className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-island disabled:opacity-50"
                            >
                                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
