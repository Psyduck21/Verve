"use client"

import { useOnboarding } from "@/contexts/onboarding-context"

const TOTAL_STEPS = 7

export function OnboardingProgress() {
  const { currentStep, progress } = useOnboarding()

  const progressPercentage = (currentStep / TOTAL_STEPS) * 100

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      {/* <div className="h-1.5 w-full bg-border/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="h-full bg-primary rounded-full"
        />
      </div> */}

      {/* Step Indicators */}
      <div className="flex items-center justify-between gap-1">
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
          const stepNumber = index + 1
          const isCompleted = progress.completedSteps.includes(stepNumber)
          const isCurrent = currentStep === stepNumber
          const isSkipped = progress.skippedSteps.includes(stepNumber)

          return (
            <div
              key={stepNumber}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                isCompleted
                  ? "bg-primary"
                  : isCurrent
                  ? "bg-primary/80"
                  : isSkipped
                  ? "bg-border/30"
                  : "bg-border/50"
              }`}
            />
          )
        })}
      </div>

      {/* Step Counter */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Step {currentStep} of {TOTAL_STEPS}</span>
        <span>{Math.round(progressPercentage)}% complete</span>
      </div>
    </div>
  )
}
