"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signup } from "../actions"
import { Icon } from "@/components/ui/Icon"
import { GoogleIcon } from "@/components/ui/GoogleIcon"
import { Loader2, ArrowRight, Sparkles, ChevronLeft } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { OnboardingProvider, useOnboarding } from "@/contexts/onboarding-context"
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress"
import { StepProfile } from "@/components/onboarding/StepProfile"
import { StepGoals } from "@/components/onboarding/StepGoals"
import { StepAISetup } from "@/components/onboarding/StepAISetup"
import { StepIntegrations } from "@/components/onboarding/StepIntegrations"
import { StepFirstTask } from "@/components/onboarding/StepFirstTask"
import { StepLearn } from "@/components/onboarding/StepLearn"
import { StepSuccess } from "@/components/onboarding/StepSuccess"

const TOTAL_STEPS = 7

const STEP_META: Record<number, { title: string; description: string }> = {
    1: { title: "Welcome to Verve.", description: "Tell us about your schedule so we can set up your perfect workflow." },
    2: { title: "Set Your Goals.", description: "How much time do you want to invest each day, and in what areas?" },
    3: { title: "AI-Powered Setup.", description: "Let Verve generate your first personalized routine automatically." },
    4: { title: "Connect Your Calendar.", description: "Sync your existing calendars to avoid conflicts and find free time." },
    5: { title: "Create Your First Task.", description: "Add something you need to do — Verve will help you schedule it." },
    6: { title: "Learn the Basics.", description: "Master shortcuts and AI commands to unlock Verve's full potential." },
    7: { title: "You're All Set! 🎉", description: "Your personalized Verve experience is ready. Let's go." },
}

function SignupContent() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showOnboarding, setShowOnboarding] = useState(false)
    const { currentStep, nextStep, prevStep, completeOnboarding } = useOnboarding()

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)
        const result = await signup(formData)
        if (result?.error) {
            setError(result.error)
        } else {
            setShowOnboarding(true)
        }
        setIsLoading(false)
    }

    async function handleGoogleSignUp() {
        setIsLoading(true)
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) {
            setError(error.message)
            setIsLoading(false)
        }
    }

    const handleNext = async () => {
        if (currentStep < TOTAL_STEPS) {
            nextStep()
        } else {
            await handleComplete()
        }
    }

    const handleComplete = async () => {
        setIsLoading(true)
        try {
            await completeOnboarding()
            window.location.href = '/dashboard'
        } catch {
            setError('Failed to complete onboarding. Please try again.')
            setIsLoading(false)
        }
    }

    const getStepComponent = () => {
        switch (currentStep) {
            case 1: return <StepProfile />
            case 2: return <StepGoals />
            case 3: return <StepAISetup />
            case 4: return <StepIntegrations />
            case 5: return <StepFirstTask />
            case 6: return <StepLearn />
            case 7: return <StepSuccess onComplete={handleComplete} />
            default: return <StepProfile />
        }
    }

    const stepMeta = STEP_META[currentStep]

    // ─── Signup form ──────────────────────────────────────────────────────────
    if (!showOnboarding) {
        return (
            <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
            >
                <div className="space-y-1">
                    <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">Create an account</h2>
                    <p className="text-muted-foreground font-medium text-sm">
                        Enter your details below to create your Verve account.
                    </p>
                </div>

                <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl border-border text-foreground font-bold hover:bg-muted shadow-sm"
                    onClick={handleGoogleSignUp}
                    disabled={isLoading}
                    type="button"
                >
                    <GoogleIcon className="w-5 h-5 mr-3" />
                    Sign up with Google
                </Button>

                <div className="relative flex items-center">
                    <div className="flex-grow border-t border-border" />
                    <span className="flex-shrink mx-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">or</span>
                    <div className="flex-grow border-t border-border" />
                </div>

                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm font-bold text-foreground ml-1">Full Name</Label>
                        <Input
                            id="fullName" name="fullName" type="text" placeholder="Alex Pro"
                            className="h-12 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground focus:bg-background transition-colors"
                            required disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-bold text-foreground ml-1">Email</Label>
                        <Input
                            id="email" name="email" type="email" placeholder="alex@example.com"
                            className="h-12 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground focus:bg-background transition-colors"
                            required disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-bold text-foreground ml-1">Password</Label>
                        <Input
                            id="password" name="password" type="password" placeholder="••••••••••••"
                            className="h-12 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground focus:bg-background transition-colors"
                            required disabled={isLoading}
                        />
                    </div>
                    {error && (
                        <div className="text-sm text-destructive font-bold bg-destructive/10 p-3 rounded-xl border border-destructive/20">
                            {error}
                        </div>
                    )}
                    <Button
                        className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                        type="submit" disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                            <><span>Create Account</span><Icon icon={ArrowRight} size="sm" /></>
                        )}
                    </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground font-medium pt-2">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary font-bold hover:underline decoration-2 underline-offset-4 ml-1">
                        Sign in
                    </Link>
                </p>
            </motion.div>
        )
    }

    // ─── Onboarding steps ─────────────────────────────────────────────────────
    return (
        <motion.div
            key="onboarding"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
        >
            {/* Header: step counter + progress */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Step {currentStep} of {TOTAL_STEPS}</span>
                    </div>
                    {currentStep > 1 && currentStep < TOTAL_STEPS && (
                        <button
                            onClick={prevStep}
                            disabled={isLoading}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ChevronLeft className="h-3 w-3" />
                            Back
                        </button>
                    )}
                </div>

                <OnboardingProgress />

                <div className="space-y-1 pt-1">
                    <h2 className="text-xl font-extrabold text-foreground tracking-tight leading-tight">
                        {stepMeta?.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {stepMeta?.description}
                    </p>
                </div>
            </div>

            {/* Step content with animated transition */}
            <div className="min-h-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`step-${currentStep}`}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                    >
                        {getStepComponent()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation — hidden on the final success step (it has its own CTA) */}
            {currentStep < TOTAL_STEPS && (
                <div className="pt-2">
                    <Button
                        onClick={handleNext}
                        className="w-full h-11 font-bold rounded-xl"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            )}

            {error && (
                <div className="text-sm text-destructive font-bold bg-destructive/10 p-3 rounded-xl border border-destructive/20">
                    {error}
                </div>
            )}
        </motion.div>
    )
}

export default function SignupPage() {
    return (
        <OnboardingProvider>
            <SignupContent />
        </OnboardingProvider>
    )
}
