"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

export interface OnboardingData {
  timezone?: string
  grind_type?: string
  wake_time?: string
  sleep_time?: string
  daily_commitment_minutes?: number
  primary_focus_areas?: string[]
  priority_preference?: string
  challenge?: string
  buffer_preference?: string
  generated_routine?: any[]
  skipped_integrations?: string[]
  first_task_created?: boolean
  first_task_title?: string
  shortcuts_learned?: boolean
}

export interface OnboardingProgress {
  completedSteps: number[]
  skippedSteps: number[]
  stepDurations: Record<number, number>
  startedAt?: Date
}

interface OnboardingContextType {
  currentStep: number
  collectedData: OnboardingData
  progress: OnboardingProgress
  nextStep: () => void
  prevStep: () => void
  goToStep: (step: number) => void
  skipStep: (step: number) => void
  updateData: (data: Partial<OnboardingData>) => void
  completeOnboarding: () => Promise<void>
  resetOnboarding: () => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [collectedData, setCollectedData] = useState<OnboardingData>({})
  const [progress, setProgress] = useState<OnboardingProgress>({
    completedSteps: [],
    skippedSteps: [],
    stepDurations: {},
  })

  const nextStep = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1)
      setProgress(prev => ({
        ...prev,
        completedSteps: [...prev.completedSteps, currentStep],
      }))
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 7) {
      setCurrentStep(step)
    }
  }

  const skipStep = (step: number) => {
    setProgress(prev => ({
      ...prev,
      skippedSteps: [...prev.skippedSteps, step],
    }))
    nextStep()
  }

  const updateData = (data: Partial<OnboardingData>) => {
    setCollectedData(prev => ({ ...prev, ...data }))
  }

  const completeOnboarding = async () => {
    try {
      const response = await fetch('/api/v1/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed_at: new Date().toISOString(),
          total_duration_ms: progress.startedAt 
            ? Date.now() - progress.startedAt.getTime() 
            : 0,
          skipped_steps: progress.skippedSteps,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to complete onboarding')
      }

      setProgress(prev => ({
        ...prev,
        completedSteps: [...prev.completedSteps, 7],
      }))
    } catch (error) {
      console.error('Error completing onboarding:', error)
      throw error
    }
  }

  const resetOnboarding = () => {
    setCurrentStep(1)
    setCollectedData({})
    setProgress({
      completedSteps: [],
      skippedSteps: [],
      stepDurations: {},
    })
  }

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        collectedData,
        progress,
        nextStep,
        prevStep,
        goToStep,
        skipStep,
        updateData,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}
