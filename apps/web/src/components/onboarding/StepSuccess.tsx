"use client"

import { useEffect } from "react"
import { useOnboarding } from "@/contexts/onboarding-context"
import { CheckCircle2, Sparkles, Calendar, ArrowRight, Home } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

interface StepSuccessProps {
  onComplete?: () => void
}

export function StepSuccess({ onComplete }: StepSuccessProps) {
  const { collectedData } = useOnboarding()

  const handleGoToDashboard = () => {
    if (onComplete) {
      onComplete()
    }
  }

  return (
    <div className="space-y-8 text-center">
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
        className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto"
      >
        <CheckCircle2 size={48} className="text-green-500" />
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 gap-3"
      >
        <div className="p-4 bg-muted/50 rounded-xl border border-border/50 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Calendar size={18} className="text-primary" />
            </div>
            <div>
              <span className="font-semibold text-sm block">AI-Powered Schedule</span>
              <span className="text-xs text-muted-foreground">
                {collectedData.generated_routines?.length || 0} routines generated for tomorrow
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-xl border border-border/50 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles size={18} className="text-primary" />
            </div>
            <div>
              <span className="font-semibold text-sm block">Personalized Preferences</span>
              <span className="text-xs text-muted-foreground">
                {collectedData.grind_type} • {collectedData.daily_commitment_minutes}min daily focus
              </span>
            </div>
          </div>
        </div>

        {collectedData.first_task_created && (
          <div className="p-4 bg-muted/50 rounded-xl border border-border/50 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-green-500" />
              </div>
              <div>
                <span className="font-semibold text-sm block">First Task Created</span>
                <span className="text-xs text-muted-foreground">
                  "{collectedData.first_task_title}" is ready to go
                </span>
              </div>
            </div>
          </div>
        )}

        {!collectedData.skipped_integrations?.includes('google_calendar') && (
          <div className="p-4 bg-muted/50 rounded-xl border border-border/50 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-green-500" />
              </div>
              <div>
                <span className="font-semibold text-sm block">Calendar Connected</span>
                <span className="text-xs text-muted-foreground">
                  Google Calendar sync enabled
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Next Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 bg-primary/5 rounded-xl border border-primary/20 text-left space-y-3"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <span className="font-semibold text-sm">What's Next?</span>
        </div>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Check your dashboard to see your AI-generated schedule</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Use Cmd/Ctrl + K to open the command palette anytime</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Try natural language: "Schedule a 30min call tomorrow at 2pm"</span>
          </li>
        </ul>
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="pt-4"
      >
        <Button
          onClick={handleGoToDashboard}
          size="lg"
          className="w-full rounded-full"
        >
          <Home className="mr-2 w-4 h-4" />
          Go to Dashboard
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </motion.div>

      {/* Auto-redirect notice */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-xs text-muted-foreground"
      >
        You'll be redirected to your dashboard automatically
      </motion.p>
    </div>
  )
}
