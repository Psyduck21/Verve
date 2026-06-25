"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, X } from "lucide-react"
import { useOnboarding } from "@/contexts/onboarding-context"

interface OnboardingNavigationProps {
  onBack?: () => void
  onNext?: () => void
  onSkip?: () => void
  isLoading?: boolean
  showSkip?: boolean
  backText?: string
  nextText?: string
  skipText?: string
}

export function OnboardingNavigation({
  onBack,
  onNext,
  onSkip,
  isLoading = false,
  showSkip = true,
  backText = "Back",
  nextText = "Continue",
  skipText = "Skip for now",
}: OnboardingNavigationProps) {
  const { currentStep, prevStep, nextStep, skipStep } = useOnboarding()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      prevStep()
    }
  }

  const handleNext = () => {
    if (onNext) {
      onNext()
    } else {
      nextStep()
    }
  }

  const handleSkip = () => {
    if (onSkip) {
      onSkip()
    } else {
      skipStep(currentStep)
    }
  }

  return (
    <div className="flex items-center justify-between mt-10">
      {/* Back Button */}
      {currentStep > 1 && (
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={isLoading}
          className="rounded-full px-6 font-semibold"
        >
          <ArrowLeft className="mr-2 w-4 h-4" />
          {backText}
        </Button>
      )}

      {/* Spacer */}
      {currentStep === 1 && <div />}

      {/* Skip Button */}
      {showSkip && currentStep < 7 && (
        <Button
          variant="ghost"
          onClick={handleSkip}
          disabled={isLoading}
          className="rounded-full px-4 font-semibold text-muted-foreground hover:text-foreground"
        >
          <X className="mr-2 w-4 h-4" />
          {skipText}
        </Button>
      )}

      {/* Next Button */}
      <Button
        onClick={handleNext}
        disabled={isLoading}
        size="lg"
        className="rounded-full px-6 font-semibold shadow-island hover:shadow-island-md hover:-translate-y-0.5 transition-all"
      >
        {nextText}
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  )
}
