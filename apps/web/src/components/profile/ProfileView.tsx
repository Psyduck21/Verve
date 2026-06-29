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
        aiUsed: 0,
        aiLimit: 0,
    })

    useEffect(() => {
        if (userProfileData?.data) {
            setProfile({
                name: userProfileData.data.full_name || "",
                email: userProfileData.data.email || "",
                role: userProfileData.data.grind_type || "",
                aiUsed: userProfileData.data.ai_requests_used_today || 0,
                aiLimit: userProfileData.data.ai_request_limit || 50,
            })
        }
    }, [userProfileData])

    const updateProfileMutation = useMutation({
        mutationFn: async (newProfile: { full_name: string, grind_type: string }) => {
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
            grind_type: profile.role
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
                                <label className="text-sm font-medium text-foreground">Role</label>
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
