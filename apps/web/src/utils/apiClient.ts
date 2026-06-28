import { createClient } from "./supabase/client"

// Base URL for the Fastify backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

class APIError extends Error {
    constructor(public status: number, message: string) {
        super(message)
        this.name = "APIError"
    }
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    const headers = new Headers(options.headers)
    headers.set("Content-Type", "application/json")

    if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`)
    }

    // For mutation requests (POST/PUT/DELETE), fetch CSRF token from backend and include it
    const method = (options.method || 'GET').toUpperCase()
    if (method !== 'GET') {
        try {
            const tokenRes = await fetch(`${API_BASE_URL}/v1/csrf-token`, { credentials: 'include' })
            if (tokenRes.ok) {
                const tokenJson = await tokenRes.json().catch(() => ({} as any))
                if (tokenJson?.csrfToken) {
                    headers.set('x-csrf-token', tokenJson.csrfToken)
                }
            }
        } catch (err) {
            // If CSRF token fetch fails, we'll still attempt the request and let the server return 403
        }
    }

    const url = new URL(`${API_BASE_URL}${endpoint}`)
    if (options.body && typeof options.body === 'object') {
        // Handle query params for GET requests
        if (options.method === 'GET' || !options.method) {
            Object.entries(options.body as Record<string, any>).forEach(([key, value]) => {
                url.searchParams.append(key, String(value))
            })
            delete options.body
        }
    }

    const response = await fetch(url.toString(), {
        ...options,
        headers,
        credentials: "include"
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new APIError(response.status, errorData.message || response.statusText)
    }

    return response.json()
}

export const apiClient = {
    // --- Onboarding Module ---
    onboarding: {
        getStatus: async () => {
            return fetchWithAuth("/v1/onboarding/status")
        },
        saveStep: async (step: number, data?: any, duration_ms?: number) => {
            return fetchWithAuth(`/v1/onboarding/step/${step}`, {
                method: "POST",
                body: JSON.stringify({ data, duration_ms }),
            })
        },
        generateRoutine: async (data: any) => {
            return fetchWithAuth("/v1/onboarding/generate-routine", {
                method: "POST",
                body: JSON.stringify(data),
            })
        },
        complete: async (data: {
            completed_at?: string
            total_duration_ms?: number
            skipped_steps?: number[]
            generated_routine?: any[]
            challenge?: string
            buffer_preference?: string
            skipped_integrations?: string[]
            first_task_created?: boolean
            first_task_title?: string
        }) => {
            return fetchWithAuth("/v1/onboarding/complete", {
                method: "POST",
                body: JSON.stringify(data),
            })
        },
        skip: async (data: { skip_from_step?: number; reason?: string }) => {
            return fetchWithAuth("/v1/onboarding/skip", {
                method: "POST",
                body: JSON.stringify(data),
            })
        },
    },

    // --- Tasks Module ---
    tasks: {
        getTasks: async (params?: { cursor?: string; limit?: number; start_date?: string; end_date?: string }) => {
            const allTasks: any[] = []
            let cursor: string | null = params?.cursor ?? null

            do {
                const endpoint = new URL("/v1/tasks", API_BASE_URL)
                endpoint.searchParams.set("limit", String(params?.limit ?? 100))
                if (cursor) {
                    endpoint.searchParams.set("cursor", cursor)
                }
                if (params?.start_date) {
                    endpoint.searchParams.set("start_date", params.start_date)
                }
                if (params?.end_date) {
                    endpoint.searchParams.set("end_date", params.end_date)
                }

                const page = await fetchWithAuth(endpoint.pathname + endpoint.search)
                const tasks = Array.isArray(page?.data) ? page.data : []
                allTasks.push(...tasks)
                cursor = page?.pagination?.nextCursor || null
            } while (cursor)

            return allTasks
        },
        createTask: async (task: any) => {
            return fetchWithAuth("/v1/tasks", {
                method: "POST",
                body: JSON.stringify(task),
            })
        },
        updateTask: async (id: string, updates: any) => {
            return fetchWithAuth(`/v1/tasks/${id}`, {
                method: "PUT",
                body: JSON.stringify(updates),
            })
        },
        deleteTask: async (id: string) => {
            return fetchWithAuth(`/v1/tasks/${id}`, {
                method: "DELETE",
            })
        },
    },

    // --- Subtasks Module ---
    subtasks: {
        create: async (taskId: string, data: { title: string; priority?: string; estimated_duration_minutes?: number; scheduled_at?: string }) => {
            return fetchWithAuth(`/v1/tasks/${taskId}/subtasks`, {
                method: "POST",
                body: JSON.stringify(data),
            })
        },
        list: async (taskId: string) => {
            return fetchWithAuth(`/v1/tasks/${taskId}/subtasks`)
        },
        update: async (taskId: string, subtaskId: string, data: any) => {
            return fetchWithAuth(`/v1/tasks/${taskId}/subtasks/${subtaskId}`, {
                method: "PUT",
                body: JSON.stringify(data),
            })
        },
        delete: async (taskId: string, subtaskId: string) => {
            return fetchWithAuth(`/v1/tasks/${taskId}/subtasks/${subtaskId}`, {
                method: "DELETE",
            })
        },
        reorder: async (taskId: string, subtaskIds: string[]) => {
            return fetchWithAuth(`/v1/tasks/${taskId}/subtasks/reorder`, {
                method: "POST",
                body: JSON.stringify({ subtaskIds }),
            })
        },
        completeAll: async (taskId: string) => {
            return fetchWithAuth(`/v1/tasks/${taskId}/subtasks/complete-all`, {
                method: "POST",
            })
        },
    },

    // --- Categories Module ---
    categories: {
        getCategories: async () => {
            return fetchWithAuth("/v1/categories").then(res => res.data || [])
        },
        createCategory: async (category: { name: string, color?: string }) => {
            return fetchWithAuth("/v1/categories", {
                method: "POST",
                body: JSON.stringify(category),
            }).then(res => res.data)
        },
        updateCategory: async (id: string, data: { name?: string, color?: string }) => {
            return fetchWithAuth(`/v1/categories/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            })
        },
        deleteCategory: async (id: string) => {
            return fetchWithAuth(`/v1/categories/${id}`, {
                method: "DELETE",
            })
        }
    },

    // --- Dashboard Module ---
    dashboard: {
        getSummary: async () => {
            return fetchWithAuth("/v1/dashboard/summary")
        }
    },

    // --- AI Module ---
    ai: {
        generateRoutine: async (data: any) => {
            return fetchWithAuth("/v1/ai/generate-routine", {
                method: "POST",
                body: JSON.stringify(data),
            })
        },
        rescheduleTasks: async (command: string, tasks: any[]) => {
            return fetchWithAuth("/v1/ai/reschedule", {
                method: "POST",
                body: JSON.stringify({ command, context: { tasks } }),
            })
        },
        parseTask: async (raw_input: string, local_time_string: string, timezone: string) => {
            return fetchWithAuth("/v1/ai/parse-task", {
                method: "POST",
                body: JSON.stringify({ raw_input, local_time_string, timezone }),
            })
        },
        omnibox: async (command: string, context_tasks: any[], local_time_string: string, timezone: string) => {
            return fetchWithAuth("/v1/ai/omnibox", {
                method: "POST",
                body: JSON.stringify({ 
                    command, 
                    local_time_string, 
                    timezone, 
                    context: { tasks: context_tasks } 
                }),
            })
        },
        assistantPlan: async (prompt: string, context?: any) => {
            return fetchWithAuth("/v1/ai/assistant/plan", {
                method: "POST",
                body: JSON.stringify({ prompt, context }),
            })
        },
        assistantExecute: async (planId: string, actions: any[]) => {
            return fetchWithAuth("/v1/ai/assistant/execute", {
                method: "POST",
                body: JSON.stringify({ plan_id: planId, actions }),
            })
        },
    },

    // --- Integrations Module ---
    integrations: {
        connectGoogle: async () => {
            return fetchWithAuth("/v1/integrations/google/connect", {
                method: "POST",
            })
        },
        getGoogleStatus: async () => {
            return fetchWithAuth("/v1/integrations/google/status")
        },
        syncNow: async () => {
            return fetchWithAuth("/v1/integrations/sync", {
                method: "POST",
            })
        }
    },

    // --- Analytics Module ---
    analytics: {
        getDailyStats: async () => {
            return fetchWithAuth("/v1/analytics/daily")
        },
        getWeeklyInsights: async () => {
            return fetchWithAuth("/v1/analytics/weekly-report")
        },
        getTrends: async () => {
            return fetchWithAuth("/v1/analytics/trends")
        },
        getHeatmap: async () => {
            return fetchWithAuth("/v1/analytics/heatmap")
        },
        getStreaks: async () => {
            return fetchWithAuth("/v1/analytics/streaks")
        }
    },

    // // --- Billing Module ---
    // billing: {
    //     getSubscription: async () => {
    //         return fetchWithAuth("/v1/billing/subscription")
    //     },
    //     createCheckoutSession: async (priceId: string) => {
    //         return fetchWithAuth("/v1/billing/checkout", {
    //             method: "POST",
    //             body: JSON.stringify({ priceId }),
    //         })
    //     },
    //     createPortalSession: async () => {
    //         return fetchWithAuth("/v1/billing/portal", {
    //             method: "POST",
    //         })
    //     }
    // },

    // --- Notifications Module ---
    notifications: {
        getHistory: async () => {
            return fetchWithAuth("/v1/notifications/history")
        },
        registerPushSubscription: async (subscription: any) => {
            return fetchWithAuth("/v1/notifications/push/subscribe", {
                method: "POST",
                body: JSON.stringify(subscription),
            })
        },
        markAsRead: async (notificationId: string) => {
            return fetchWithAuth(`/v1/notifications/${notificationId}/read`, {
                method: "PUT",
            })
        }
    },

    // --- Users & Admin Module ---
    users: {
        getProfile: async () => {
            return fetchWithAuth("/v1/users/profile")
        },
        updatePreferences: async (preferences: any) => {
            return fetchWithAuth("/v1/users/preferences", {
                method: "PUT",
                body: JSON.stringify(preferences),
            })
        }
    },

    // --- Time Blocks Module ---
    timeblocks: {
        create: async (data: any) => {
            return fetchWithAuth("/v1/timeblocks", {
                method: "POST",
                body: JSON.stringify(data),
            })
        },
        list: async (params?: any) => {
            return fetchWithAuth("/v1/timeblocks", { method: "GET", body: params })
        },
        get: async (id: string) => {
            return fetchWithAuth(`/v1/timeblocks/${id}`)
        },
        update: async (id: string, data: any) => {
            return fetchWithAuth(`/v1/timeblocks/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            })
        },
        delete: async (id: string) => {
            return fetchWithAuth(`/v1/timeblocks/${id}`, {
                method: "DELETE",
            })
        },
        convertToTask: async (id: string) => {
            return fetchWithAuth(`/v1/timeblocks/${id}/convert-to-task`, {
                method: "POST",
            })
        },
        getByDate: async (date: string) => {
            return fetchWithAuth(`/v1/timeblocks/date/${date}`)
        }
    },

    // --- Templates Module ---
    templates: {
        create: async (data: any) => {
            return fetchWithAuth("/v1/templates", {
                method: "POST",
                body: JSON.stringify(data),
            })
        },
        list: async (params?: any) => {
            return fetchWithAuth("/v1/templates", { method: "GET", body: params })
        },
        get: async (id: string) => {
            return fetchWithAuth(`/v1/templates/${id}`)
        },
        update: async (id: string, data: any) => {
            return fetchWithAuth(`/v1/templates/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            })
        },
        delete: async (id: string) => {
            return fetchWithAuth(`/v1/templates/${id}`, {
                method: "DELETE",
            })
        },
        apply: async (id: string, data: any) => {
            return fetchWithAuth(`/v1/templates/${id}/apply`, {
                method: "POST",
                body: JSON.stringify(data),
            })
        },
        duplicate: async (id: string) => {
            return fetchWithAuth(`/v1/templates/${id}/duplicate`, {
                method: "POST",
            })
        }
    },

    // --- Routines Module ---
    routines: {
        getRoutines: async () => {
            return fetchWithAuth("/v1/routines")
        },
        createRoutine: async (data: { title: string; goal?: string }) => {
            return fetchWithAuth("/v1/routines", {
                method: "POST",
                body: JSON.stringify(data),
            })
        },
        updateRoutine: async (id: string, data: any) => {
            return fetchWithAuth(`/v1/routines/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            })
        },
        deleteRoutine: async (id: string) => {
            return fetchWithAuth(`/v1/routines/${id}`, {
                method: "DELETE",
            })
        }
    }
}
