"use client"

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react'
import { apiClient } from '@/utils/apiClient'

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
  generated_routines?: any[]
  accepted_routine?: any
  skipped_integrations?: string[]
  first_task_created?: boolean
  first_task_title?: string
  shortcuts_learned?: boolean
  extension_installed?: boolean
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

  const nextStep = useCallback(() => {
    setCurrentStep(prevStepNumber => {
      if (prevStepNumber >= 7) {
        return prevStepNumber
      }

      setProgress(prev => ({
        ...prev,
        completedSteps: prev.completedSteps.includes(prevStepNumber)
          ? prev.completedSteps
          : [...prev.completedSteps, prevStepNumber],
      }))

      return prevStepNumber + 1
    })
  }, [])

  const prevStep = useCallback(() => {
    setCurrentStep(prevStepNumber => (prevStepNumber > 1 ? prevStepNumber - 1 : prevStepNumber))
  }, [])

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 7) {
      setCurrentStep(step)
    }
  }, [])

  const skipStep = useCallback((step: number) => {
    setProgress(prev => ({
      ...prev,
      skippedSteps: prev.skippedSteps.includes(step)
        ? prev.skippedSteps
        : [...prev.skippedSteps, step],
    }))
    nextStep()
  }, [nextStep])

  const updateData = useCallback((data: Partial<OnboardingData>) => {
    setCollectedData(prev => {
      const hasChanges = Object.entries(data).some(([key, value]) => !Object.is(prev[key as keyof OnboardingData], value))
      if (!hasChanges) {
        return prev
      }

      return { ...prev, ...data }
    })
  }, [])

  const completeOnboarding = useCallback(async () => {
    try {
      await apiClient.onboarding.complete({
        completed_at: new Date().toISOString(),
        total_duration_ms: progress.startedAt
          ? Date.now() - progress.startedAt.getTime()
          : 0,
        skipped_steps: progress.skippedSteps,
        challenge: collectedData.challenge,
        buffer_preference: collectedData.buffer_preference,
        skipped_integrations: collectedData.skipped_integrations,
        first_task_created: collectedData.first_task_created,
        first_task_title: collectedData.first_task_title,
      })

      setProgress(prev => ({
        ...prev,
        completedSteps: [...prev.completedSteps, 7],
      }))
    } catch (error) {
      console.error('Error completing onboarding:', error)
      throw error
    }
  }, [collectedData, progress.skippedSteps, progress.startedAt])

  const resetOnboarding = useCallback(() => {
    setCurrentStep(1)
    setCollectedData({})
    setProgress({
      completedSteps: [],
      skippedSteps: [],
      stepDurations: {},
    })
  }, [])

  const value = useMemo(
    () => ({
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
    }),
    [
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
    ]
  )

  return (
    <OnboardingContext.Provider value={value}>
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
