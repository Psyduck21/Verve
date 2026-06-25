import { Icon } from "@/components/ui/Icon"
import { Calendar, CheckCircle2, HelpCircle } from "lucide-react"
import Link from "next/link"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Minimal Header */}
            <header className="absolute top-0 left-0 right-0 w-full z-50">
                <div className="flex items-center justify-between px-8 py-6 w-full max-w-[1600px] mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                            <Icon icon={Calendar} size="sm" />
                        </div>
                        <h1 className="font-bold text-foreground text-xl tracking-tight">Verve</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/support" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                            <span>Support</span>
                            <Icon icon={HelpCircle} size="sm" />
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex w-full">
                {/* Left Side: Content & Branding */}
                <div className="hidden lg:flex lg:w-1/2 bg-muted flex-col justify-center items-center p-12 relative overflow-hidden">
                    <div className="max-w-md z-10 pt-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-8 shadow-xl shadow-primary/20">
                            <Icon icon={Calendar} size="md" className="w-8 h-8" />
                        </div>
                        <h2 className="text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mb-6 leading-[1.1]">
                            Master your schedule, empower your team.
                        </h2>
                        <p className="text-lg text-muted-foreground font-medium mb-10 leading-relaxed">
                            Join over 10,000+ teams using Scheduler to streamline their daily operations and maximize productivity.
                        </p>
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                            {["Smart Automated Booking", "Team Synchronization", "Detailed Analytics", "Enterprise Security"].map(feat => (
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

                {/* Right Side: Form Content */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-card relative z-10 shadow-[-20px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="w-full max-w-[400px]">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
