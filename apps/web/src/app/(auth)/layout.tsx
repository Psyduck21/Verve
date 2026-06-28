"use client"

import { Icon } from "@/components/ui/Icon"
import { VerveLogo } from "@/components/ui/VerveLogo"
import { Calendar, CheckCircle2, HelpCircle, Sparkles } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const brandingFeatures = [
    "Smart Automated Booking",
    "Team Synchronization",
    "Detailed Analytics",
    "Enterprise Security",
]

const onboardingStepLabels: Record<number, string> = {
    1: "Profile Setup",
    2: "Set Your Goals",
    3: "AI-Powered Setup",
    4: "Connect Calendar",
    5: "First Task",
    6: "Learn the Basics",
    7: "All Set!",
}

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isOnboarding = pathname.startsWith('/onboarding')

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden">
            {/* Minimal Header */}
            <header className="fixed top-0 left-0 right-0 w-full z-50 bg-background/50 backdrop-blur-sm border-b border-border/50 lg:border-none lg:bg-transparent lg:backdrop-blur-none">
                <div className="flex items-center justify-between px-8 py-6 w-full max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-foreground/5 shadow-sm border border-border flex items-center justify-center">
                            <VerveLogo className="w-5 h-5" />
                        </div>
                        <h1 className="font-bold text-foreground text-xl tracking-tight">Verve</h1>
                    </div>
                    {!isOnboarding && (
                        <div className="flex items-center gap-2">
                            <Link href="/support" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                                <span>Support</span>
                                <Icon icon={HelpCircle} size="sm" />
                            </Link>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 flex w-full">
                {/* Left Side: Static Branding — persists across signup + all onboarding steps */}
                <div className="hidden lg:flex lg:w-1/2 bg-muted flex-col justify-center items-center p-12 relative overflow-hidden sticky top-0 h-screen">
                    <div className="max-w-md z-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-foreground/5 border border-border mb-8 shadow-xl">
                            <VerveLogo className="w-10 h-10" />
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mb-6 leading-[1.1]">
                            {isOnboarding
                                ? "Personalizing your experience."
                                : "Master your schedule, empower your team."}
                        </h2>
                        <p className="text-lg text-muted-foreground font-medium mb-10 leading-relaxed">
                            {isOnboarding
                                ? "Just a few quick questions and Verve will build your perfect productivity setup automatically."
                                : "Join over 10,000+ teams using Verve to streamline their daily operations and maximize productivity."}
                        </p>
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                            {brandingFeatures.map(feat => (
                                <div key={feat} className="flex items-start gap-2">
                                    <Icon icon={CheckCircle2} size="sm" className="text-primary shrink-0 mt-0.5" />
                                    <span className="text-sm font-bold text-foreground leading-tight">{feat}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Decorative background element */}
                    <div className="absolute -bottom-32 -left-32 opacity-[0.03] pointer-events-none">
                        <div className="w-[800px] h-[800px] rounded-full bg-primary blur-3xl" />
                    </div>
                </div>

                {/* Right Side: Form / Onboarding steps */}
                <div className="w-full lg:w-1/2 flex items-start justify-center p-6 sm:p-10 pt-24 bg-card relative z-10 shadow-[-20px_0_40px_rgba(0,0,0,0.02)] h-screen overflow-y-auto">
                    <div className="w-full max-w-[460px] pb-12">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
