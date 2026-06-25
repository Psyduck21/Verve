"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Sparkles } from "lucide-react"
import { OnboardingProvider, useOnboarding } from "@/contexts/onboarding-context"
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress"
import { OnboardingNavigation } from "@/components/onboarding/OnboardingNavigation"
import { StepProfile } from "@/components/onboarding/StepProfile"
import { StepGoals } from "@/components/onboarding/StepGoals"
import { StepAISetup } from "@/components/onboarding/StepAISetup"
import { StepIntegrations } from "@/components/onboarding/StepIntegrations"
import { StepFirstTask } from "@/components/onboarding/StepFirstTask"
import { StepLearn } from "@/components/onboarding/StepLearn"
import { StepSuccess } from "@/components/onboarding/StepSuccess"

function OnboardingContent() {
    const router = useRouter()
    const { currentStep, collectedData, nextStep, completeOnboarding } = useOnboarding()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleNext = async () => {
        if (currentStep === 2) {
            // Save step 2 data to backend
            setIsLoading(true)
            setError(null)
            try {
                const response = await fetch('/api/v1/onboarding/step/2', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        step: 2,
                        data: collectedData,
                    }),
                })
                
                if (!response.ok) {
                    throw new Error('Failed to save progress')
                }
                
                nextStep()
            } catch (err) {
                setError('Failed to save your preferences. Please try again.')
            } finally {
                setIsLoading(false)
            }
        } else {
            nextStep()
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

    const getStepTitle = () => {
        switch (currentStep) {
            case 1:
                return "Welcome to Verve."
            case 2:
                return "Set Your Goals."
            case 3:
                return "AI-Powered Setup."
            case 4:
                return "Connect Your Calendar."
            case 5:
                return "Create Your First Task."
            case 6:
                return "Learn the Basics."
            case 7:
                return "You're All Set!"
            default:
                return "Setup"
        }
    }

    const getStepDescription = () => {
        switch (currentStep) {
            case 1:
                return "Let's align your environment. We need your timezone and work schedule for perfect AI scheduling."
            case 2:
                return "Set your daily commitment and focus areas to help Verve tailor your experience."
            case 3:
                return "Verve's AI will generate your first personalized routine based on your preferences."
            case 4:
                return "Sync your existing calendar events to avoid conflicts and find optimal time blocks."
            case 5:
                return "Add a task to get started and understand how Verve works."
            case 6:
                return "Master keyboard shortcuts and AI commands to unlock Verve's full potential."
            case 7:
                return "Your personalized Verve experience is ready."
            default:
                return ""
        }
    }

    return (
        <div className="flex min-h-screen w-full items-center justify-center p-4 bg-background overflow-hidden relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-lg z-10"
            >
                <div className="bg-card/60 backdrop-blur-3xl shadow-island-lg border border-border/50 rounded-3xl p-10 overflow-hidden relative">
                    {/* Decorative Top Line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                    
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                            <Sparkles size={16} />
                        </div>
                        <span className="font-bold tracking-widest uppercase text-xs text-muted-foreground">Setup</span>
                    </div>

                    {/* Progress */}
                    <OnboardingProgress />

                    <div className="mt-8 mb-6">
                        <h1 className="text-3xl font-bold tracking-tight mb-2">{getStepTitle()}</h1>
                        <p className="text-muted-foreground">{getStepDescription()}</p>
                    </div>

                    <AnimatePresence mode="wait">
                        {currentStep === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <StepProfile />
                            </motion.div>
                        )}

                        {currentStep === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <StepGoals />
                            </motion.div>
                        )}

                        {currentStep === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <StepAISetup />
                            </motion.div>
                        )}

                        {currentStep === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <StepIntegrations />
                            </motion.div>
                        )}

                        {currentStep === 5 && (
                            <motion.div
                                key="step5"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <StepFirstTask />
                            </motion.div>
                        )}

                        {currentStep === 6 && (
                            <motion.div
                                key="step6"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <StepLearn />
                            </motion.div>
                        )}

                        {currentStep === 7 && (
                            <motion.div
                                key="step7"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <StepSuccess />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
                            {error}
                        </motion.div>
                    )}

                    {/* Hide navigation on success step */}
                    {currentStep !== 7 && (
                        <OnboardingNavigation 
                            onNext={currentStep === 7 ? handleComplete : handleNext}
                            isLoading={isLoading}
                            nextText={currentStep === 7 ? "Complete Setup" : "Continue"}
                        />
                    )}
                </div>
            </motion.div>
        </div>
    )
}

export default function OnboardingPage() {
    return (
        <OnboardingProvider>
            <OnboardingContent />
        </OnboardingProvider>
    )
}
