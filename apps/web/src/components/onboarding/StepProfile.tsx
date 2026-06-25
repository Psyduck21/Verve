"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useOnboarding } from "@/contexts/onboarding-context"
import { Clock, Sunrise, Moon, Zap } from "lucide-react"

const GRIND_TYPES = [
  { id: "early_bird", title: "Early Bird", desc: "5 AM - 9 AM start", icon: Sunrise },
  { id: "9_to_5", title: "9-to-5 Professional", desc: "Standard work hours", icon: Clock },
  { id: "night_owl", title: "Night Owl", desc: "Late start, late finish", icon: Moon },
  { id: "flexible", title: "Flexible Creator", desc: "Variable schedule", icon: Zap },
  { id: "shift_worker", title: "Shift Worker", desc: "Rotating/irregular", icon: Clock },
]

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
]

export function StepProfile() {
  const { collectedData, updateData } = useOnboarding()
  const [timezone, setTimezone] = useState(collectedData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [grindType, setGrindType] = useState(collectedData.grind_type || "9_to_5")
  const [wakeTime, setWakeTime] = useState(collectedData.wake_time ? parseInt(collectedData.wake_time.split(":")[0]) : 9)
  const [sleepTime, setSleepTime] = useState(collectedData.sleep_time ? parseInt(collectedData.sleep_time.split(":")[0]) : 22)
  const [weekendWarrior, setWeekendWarrior] = useState(false)

  useEffect(() => {
    updateData({
      timezone,
      grind_type: grindType,
      wake_time: `${wakeTime.toString().padStart(2, '0')}:00:00`,
      sleep_time: `${sleepTime.toString().padStart(2, '0')}:00:00`,
    })
  }, [timezone, grindType, wakeTime, sleepTime, updateData])

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM"
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:00 ${period}`
  }

  const totalHours = sleepTime > wakeTime ? sleepTime - wakeTime : 24 - wakeTime + sleepTime

  return (
    <div className="space-y-8">
      {/* Timezone */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Your Timezone
        </Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger className="h-12 bg-background border-border/50 rounded-xl focus:ring-primary shadow-subtle">
            <SelectValue placeholder="Select a timezone" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/50">
            <SelectItem value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
              {Intl.DateTimeFormat().resolvedOptions().timeZone} (Detected)
            </SelectItem>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grind Type */}
      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Your Schedule Type
        </Label>
        <div className="grid grid-cols-1 gap-3">
          {GRIND_TYPES.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setGrindType(item.id)}
                className={`flex items-center gap-4 text-left p-4 rounded-xl border transition-all ${
                  grindType === item.id
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border/50 hover:border-border text-foreground"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  grindType === item.id ? "bg-primary/20" : "bg-muted"
                }`}>
                  <Icon size={18} className={grindType === item.id ? "text-primary" : "text-muted-foreground"} />
                </div>
                <div>
                  <span className="font-semibold text-sm block">{item.title}</span>
                  <span className={`text-xs mt-1 block ${grindType === item.id ? "text-primary/70" : "text-muted-foreground"}`}>
                    {item.desc}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Work Hours */}
      <div className="space-y-4">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Work Hours
        </Label>
        
        {/* Wake Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Wake up at</span>
            <span className="text-sm font-semibold">{formatTime(wakeTime)}</span>
          </div>
          <Select value={wakeTime.toString()} onValueChange={(val) => setWakeTime(parseInt(val))}>
            <SelectTrigger className="h-12 bg-background border-border/50 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50">
              {Array.from({ length: 7 }, (_, i) => i + 5).map((hour) => (
                <SelectItem key={hour} value={hour.toString()}>
                  {formatTime(hour)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sleep Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sleep at</span>
            <span className="text-sm font-semibold">{formatTime(sleepTime)}</span>
          </div>
          <Select value={sleepTime.toString()} onValueChange={(val) => setSleepTime(parseInt(val))}>
            <SelectTrigger className="h-12 bg-background border-border/50 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50">
              {Array.from({ length: 8 }, (_, i) => i + 20).map((hour) => (
                <SelectItem key={hour} value={hour.toString()}>
                  {formatTime(hour)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Total Hours */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">Active hours</span>
          <span className="text-sm font-semibold">{totalHours} hours</span>
        </div>

        {/* Weekend Warrior Toggle */}
        <div className="flex items-center justify-between p-4 bg-background border border-border/50 rounded-xl">
          <div>
            <span className="font-semibold text-sm block">Weekend Warrior</span>
            <span className="text-xs text-muted-foreground">Work on weekends too</span>
          </div>
          <Switch checked={weekendWarrior} onCheckedChange={setWeekendWarrior} />
        </div>
      </div>
    </div>
  )
}
