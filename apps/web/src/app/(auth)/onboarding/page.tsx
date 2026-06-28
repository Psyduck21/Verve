"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Sparkles, ArrowRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OnboardingProvider, useOnboarding } from "@/contexts/onboarding-context"
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress"
import { StepProfile } from "@/components/onboarding/StepProfile"
import { StepGoals } from "@/components/onboarding/StepGoals"
import { StepAISetup } from "@/components/onboarding/StepAISetup"
import { StepIntegrations } from "@/components/onboarding/StepIntegrations"
import { StepFirstTask } from "@/components/onboarding/StepFirstTask"
import { StepLearn } from "@/components/onboarding/StepLearn"
import { StepSuccess } from "@/components/onboarding/StepSuccess"
import { apiClient } from "@/utils/apiClient"

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

function OnboardingContent() {
    const router = useRouter()
    const { currentStep, collectedData, nextStep, prevStep, updateData, completeOnboarding } = useOnboarding()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleNext = async () => {
        if (currentStep === 2) {
            setIsLoading(true)
            setError(null)
            try {
                await apiClient.onboarding.saveStep(2, collectedData)
                nextStep()
            } catch (err) {
                setError('Failed to save your preferences. Please try again.')
            } finally {
                setIsLoading(false)
            }
        } else {
            if (currentStep === 6) {
                updateData({ shortcuts_learned: true })
            }
            if (currentStep < TOTAL_STEPS) {
                nextStep()
            } else {
                await handleComplete()
            }
        }
    }

    const handleComplete = async () => {
        setIsLoading(true)
        setError(null)
        try {
            await completeOnboarding()
            router.push('/dashboard')
        } catch (err) {
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

export default function OnboardingPage() {
    return (
        <OnboardingProvider>
            <OnboardingContent />
        </OnboardingProvider>
    )
}
