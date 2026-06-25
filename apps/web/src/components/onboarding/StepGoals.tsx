"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useOnboarding } from "@/contexts/onboarding-context"
import { Target, Briefcase, Heart, BookOpen, Dumbbell, Lightbulb } from "lucide-react"

const FOCUS_AREAS = [
  { id: "work", title: "Work Projects", desc: "Startups, coding, meetings", icon: Briefcase },
  { id: "meetings", title: "Meetings", desc: "Calls, syncs, reviews", icon: Target },
  { id: "personal", title: "Personal Habits", desc: "Health, routines, self-care", icon: Heart },
  { id: "learning", title: "Learning", desc: "Courses, reading, skills", icon: BookOpen },
  { id: "health", title: "Health & Fitness", desc: "Exercise, nutrition, wellness", icon: Dumbbell },
  { id: "creative", title: "Creative Work", desc: "Writing, design, art", icon: Lightbulb },
]

const COMMITMENT_PRESETS = [
  { value: 15, label: "15 min", desc: "Quick wins" },
  { value: 30, label: "30 min", desc: "Light focus" },
  { value: 60, label: "1 hour", desc: "Moderate" },
  { value: 120, label: "2 hours", desc: "Deep work" },
  { value: 240, label: "4 hours", desc: "Intensive" },
  { value: 480, label: "8 hours", desc: "Full day" },
]

const PREFERENCES = [
  { id: "urgency", title: "Urgency-First", desc: "Handle immediate fires first" },
  { id: "deep_work", title: "Deep Work-First", desc: "Protect focus time" },
  { id: "balanced", title: "Balanced", desc: "Let AI decide" },
]

export function StepGoals() {
  const { collectedData, updateData } = useOnboarding()
  const [dailyCommitment, setDailyCommitment] = useState(collectedData.daily_commitment_minutes || 120)
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>(
    collectedData.primary_focus_areas || ["work"]
  )
  const [priorityPreference, setPriorityPreference] = useState(
    collectedData.priority_preference || "balanced"
  )

  useEffect(() => {
    updateData({
      daily_commitment_minutes: dailyCommitment,
      primary_focus_areas: selectedFocusAreas,
      priority_preference: priorityPreference,
    })
  }, [dailyCommitment, selectedFocusAreas, priorityPreference, updateData])

  const toggleFocusArea = (id: string) => {
    setSelectedFocusAreas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-8">
      {/* Daily Commitment */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Daily Focus Time
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {COMMITMENT_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setDailyCommitment(preset.value)}
              className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                dailyCommitment === preset.value
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border/50 hover:border-border text-foreground"
              }`}
            >
              <span className="font-semibold text-sm">{preset.label}</span>
              <span className={`text-xs mt-1 ${dailyCommitment === preset.value ? "text-primary/70" : "text-muted-foreground"}`}>
                {preset.desc}
              </span>
            </button>
          ))}
        </div>
        <div className="text-center text-sm text-muted-foreground">
          {dailyCommitment} minutes of focused work per day
        </div>
      </div>

      {/* Focus Areas */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Primary Focus Areas
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {FOCUS_AREAS.map((area) => {
            const Icon = area.icon
            const isSelected = selectedFocusAreas.includes(area.id)
            return (
              <button
                key={area.id}
                onClick={() => toggleFocusArea(area.id)}
                className={`flex items-center gap-3 text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border/50 hover:border-border text-foreground"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isSelected ? "bg-primary/20" : "bg-muted"
                }`}>
                  <Icon size={16} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                </div>
                <div>
                  <span className="font-semibold text-sm block">{area.title}</span>
                  <span className={`text-xs mt-0.5 block ${isSelected ? "text-primary/70" : "text-muted-foreground"}`}>
                    {area.desc}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Priority Preference */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Scheduling Priority
        </Label>
        <div className="grid grid-cols-1 gap-3">
          {PREFERENCES.map((pref) => (
            <button
              key={pref.id}
              onClick={() => setPriorityPreference(pref.id)}
              className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                priorityPreference === pref.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border/50 hover:border-border text-foreground"
              }`}
            >
              <span className="font-semibold text-sm">{pref.title}</span>
              <span className={`text-xs mt-1 ${priorityPreference === pref.id ? "text-primary/70" : "text-muted-foreground"}`}>
                {pref.desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
