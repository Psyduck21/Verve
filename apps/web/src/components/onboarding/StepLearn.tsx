"use client"

import { useState } from "react"
import { Keyboard, Command, Zap, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const SHORTCUTS = [
  { key: "Cmd/Ctrl + K", description: "Open command palette", icon: Command },
  { key: "/", description: "Create new task", icon: Zap },
  { key: "?", description: "Show all shortcuts", icon: Keyboard },
]

const AI_COMMANDS = [
  { command: "Schedule meeting with John at 2pm", description: "AI parses time and creates task" },
  { command: "Move my 3pm call to 4pm", description: "AI reschedules existing task" },
  { command: "Defragment my calendar", description: "AI optimizes your schedule" },
]

export function StepLearn() {
  const [activeTab, setActiveTab] = useState<"shortcuts" | "ai">("shortcuts")
  const [completedShortcuts, setCompletedShortcuts] = useState<Set<number>>(new Set())
  const [completedAI, setCompletedAI] = useState<Set<number>>(new Set())

  const toggleShortcut = (index: number) => {
    setCompletedShortcuts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const toggleAI = (index: number) => {
    setCompletedAI(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const totalCompleted = completedShortcuts.size + completedAI.size
  const totalItems = SHORTCUTS.length + AI_COMMANDS.length
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Learn the Basics</h3>
        <p className="text-sm text-muted-foreground">
          Master these shortcuts and AI commands to unlock Verve's full potential.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalCompleted / totalItems) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-primary"
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          {totalCompleted}/{totalItems}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
        <button
          onClick={() => setActiveTab("shortcuts")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === "shortcuts"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Keyboard Shortcuts
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === "ai"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          AI Commands
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "shortcuts" && (
          <motion.div
            key="shortcuts"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-3"
          >
            {SHORTCUTS.map((shortcut, index) => {
              const Icon = shortcut.icon
              const completed = completedShortcuts.has(index)
              return (
                <motion.button
                  key={index}
                  onClick={() => toggleShortcut(index)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    completed
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-background border-border/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        completed ? "bg-green-500/20" : "bg-muted"
                      }`}>
                        {completed ? (
                          <Check size={18} className="text-green-500" />
                        ) : (
                          <Icon size={18} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-sm block">{shortcut.key}</span>
                        <span className="text-xs text-muted-foreground block mt-1">
                          {shortcut.description}
                        </span>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      completed ? "border-green-500 bg-green-500" : "border-border"
                    }`}>
                      {completed && <Check size={12} className="text-white" />}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
        )}

       {activeTab === "ai" && (
          <motion.div
            key="ai"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-3"
          >
            {AI_COMMANDS.map((cmd, index) => {
              const completed = completedAI.has(index)
              return (
                <motion.button
                  key={index}
                  onClick={() => toggleAI(index)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`w-full p-4 rounded-xl border transition-all text-left ${
                    completed
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-background border-border/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="font-mono text-sm block bg-muted/50 px-2 py-1 rounded">
                        {cmd.command}
                      </span>
                      <span className="text-xs text-muted-foreground block mt-2">
                        {cmd.description}
                      </span>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      completed ? "border-green-500 bg-green-500" : "border-border"
                    }`}>
                      {completed && <Check size={12} className="text-white" />}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tip */}
      <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-primary" />
          </div>
          <div>
            <span className="font-semibold text-sm block">Pro Tip</span>
            <span className="text-xs text-muted-foreground block mt-1">
              Use natural language! Type "Schedule a 30min call with Sarah tomorrow at 2pm" and Verve's AI will handle the rest.
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
