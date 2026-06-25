import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Providers } from "@/components/Providers"
import { OfflineIndicator } from "@/components/ui/offline-indicator"
import { GlobalShortcuts } from "@/components/GlobalShortcuts"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import "./globals.css"

export const metadata: Metadata = {
    title: {
        default: "Verve — Your Day, In Motion",
        template: "%s | Verve",
    },
    description:
        "Verve is an AI-powered calendar scheduler that automatically reschedules meetings, resolves conflicts, and keeps you in your flow state.",
    icons: {
        icon: "/logo.png",
        shortcut: "/logo.png",
    },
}

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#2563EB" },
        { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    ],
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html
            lang="en"
            className={`${GeistSans.variable} ${GeistMono.variable}`}
            suppressHydrationWarning
        >
            <body className="min-h-screen bg-background font-sans antialiased text-foreground">
                <ErrorBoundary>
                    <Providers>
                        {children}
                        <OfflineIndicator />
                        <GlobalShortcuts />
                    </Providers>
                </ErrorBoundary>
            </body>
        </html>
    )
}
