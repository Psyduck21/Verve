"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOnboarding } from "@/contexts/onboarding-context"
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const CHALLENGES = [
  { id: "too_many_meetings", title: "Too many meetings", desc: "Can't find focus time" },
  { id: "forgetting_tasks", title: "Forgetting tasks", desc: "Things slip through" },
  { id: "work_life_balance", title: "Work-life balance", desc: "Struggling to disconnect" },
  { id: "scheduling_conflicts", title: "Scheduling conflicts", desc: "Double bookings" },
  { id: "none", title: "None of the above", desc: "Just want to be organized" },
]

const BUFFER_PREFERENCES = [
  { id: "back_to_back", title: "Back-to-back", desc: "Maximize efficiency" },
  { id: "buffer_time", title: "Buffer time", desc: "5-10 min between tasks" },
  { id: "flexible", title: "Flexible", desc: "AI decides based on context" },
]

export function StepAISetup() {
  const { collectedData, updateData } = useOnboarding()
  const [challenge, setChallenge] = useState(collectedData.challenge || "")
  const [bufferPreference, setBufferPreference] = useState("flexible")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedTasks, setGeneratedTasks] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)

  const handleGenerateRoutine = async () => {
    setIsGenerating(true)
    setError(null)
    
    try {
      const response = await fetch('/api/v1/onboarding/generate-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...collectedData,
          challenge,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate routine')
      }

      const data = await response.json()
      setGeneratedTasks(data.data)
      setIsFallback(data.fallback || false)
      
      // Update collected data with generated tasks
      updateData({ generated_routine: data.data })
    } catch (err) {
      setError('Failed to generate routine. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAccept = () => {
    // Tasks will be saved when completing onboarding
    updateData({ challenge, buffer_preference: bufferPreference })
  }

  const handleRegenerate = () => {
    setGeneratedTasks([])
    handleGenerateRoutine()
  }

  useEffect(() => {
    // Auto-generate when component mounts
    if (!generatedTasks.length && !isGenerating) {
      handleGenerateRoutine()
    }
  }, [])

  return (
    <div className="space-y-8">
      {/* Challenge Selection */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          What's your biggest scheduling challenge?
        </Label>
        <div className="grid grid-cols-1 gap-2">
          {CHALLENGES.map((item) => (
            <button
              key={item.id}
              onClick={() => setChallenge(item.id)}
              className={`flex items-center gap-3 text-left p-3 rounded-xl border transition-all ${
                challenge === item.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border/50 hover:border-border text-foreground"
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                challenge === item.id ? "border-primary bg-primary" : "border-border"
              }`}>
                {challenge === item.id && <CheckCircle2 size={12} className="text-primary-foreground" />}
              </div>
              <div>
                <span className="font-semibold text-sm block">{item.title}</span>
                <span className={`text-xs mt-0.5 block ${challenge === item.id ? "text-primary/70" : "text-muted-foreground"}`}>
                  {item.desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Buffer Preference */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Task Spacing Preference
        </Label>
        <div className="grid grid-cols-1 gap-2">
          {BUFFER_PREFERENCES.map((item) => (
            <button
              key={item.id}
              onClick={() => setBufferPreference(item.id)}
              className={`flex items-center gap-3 text-left p-3 rounded-xl border transition-all ${
                bufferPreference === item.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border/50 hover:border-border text-foreground"
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                bufferPreference === item.id ? "border-primary bg-primary" : "border-border"
              }`}>
                {bufferPreference === item.id && <CheckCircle2 size={12} className="text-primary-foreground" />}
              </div>
              <div>
                <span className="font-semibold text-sm block">{item.title}</span>
                <span className={`text-xs mt-0.5 block ${bufferPreference === item.id ? "text-primary/70" : "text-muted-foreground"}`}>
                  {item.desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* AI Generation Status */}
      <div className="space-y-4">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          AI-Powered Routine
        </Label>

        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-muted/50 rounded-xl border border-border/50"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div>
                <span className="font-semibold text-sm">Generating your personalized routine...</span>
                <span className="text-xs text-muted-foreground block mt-1">
                  AI is analyzing your preferences to create tomorrow's schedule
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-destructive/10 rounded-xl border border-destructive/20"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div>
                <span className="font-semibold text-sm text-destructive">Generation Failed</span>
                <span className="text-xs text-destructive/80 block mt-1">{error}</span>
              </div>
            </div>
          </motion.div>
        )}

        {generatedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">
                Your AI-Generated Routine for Tomorrow
              </span>
              {isFallback && (
                <span className="text-xs text-muted-foreground">(Template-based)</span>
              )}
            </div>

            <div className="space-y-2">
              {generatedTasks.map((task, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-3 bg-background border border-border/50 rounded-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className="font-semibold text-sm block">{task.title}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{task.estimated_duration_minutes} min</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      task.priority === 'critical' ? 'bg-destructive/10 text-destructive' :
                      task.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                      task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-green-500/10 text-green-500'
                    }`}>
                      {task.priority}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRegenerate}
                className="flex-1 p-3 bg-background border border-border/50 rounded-xl text-sm font-semibold hover:border-border transition-all"
              >
                Regenerate
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 p-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all"
              >
                Accept Routine
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
