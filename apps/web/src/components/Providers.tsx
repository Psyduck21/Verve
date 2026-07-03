"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { ThemeProvider } from "next-themes"
import { initPostHog } from "@/lib/posthog"

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minute
                        refetchOnWindowFocus: true,
                    },
                },
            })
    )

    useEffect(() => {
        initPostHog()
    }, [])

    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <QueryClientProvider client={queryClient}>
                {children}
                {/* P2-A: Only ship devtools bundle in development */}
                {process.env.NODE_ENV === "development" && (
                    <DevtoolsLoader />
                )}
            </QueryClientProvider>
        </ThemeProvider>
    )
}

// Isolated lazy-load so the devtools JS is never bundled for production
function DevtoolsLoader() {
    const [Devtools, setDevtools] = useState<React.ComponentType<{ initialIsOpen: boolean }> | null>(null)
    useEffect(() => {
        import("@tanstack/react-query-devtools").then(m => {
            setDevtools(() => m.ReactQueryDevtools)
        })
    }, [])
    return Devtools ? <Devtools initialIsOpen={false} /> : null
}
