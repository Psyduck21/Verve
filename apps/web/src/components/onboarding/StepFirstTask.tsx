"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useOnboarding } from "@/contexts/onboarding-context"
import { Plus, Sparkles, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"

const EXAMPLE_TASKS = [
  { title: "Review project proposal", category: "work" },
  { title: "Schedule team sync", category: "work" },
  { title: "Read 30 pages", category: "learning" },
  { title: "Morning workout", category: "health" },
  { title: "Plan tomorrow's priorities", category: "planning" },
]

export function StepFirstTask() {
  const { collectedData, updateData } = useOnboarding()
  const [taskTitle, setTaskTitle] = useState("")
  const [selectedExample, setSelectedExample] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createdTask, setCreatedTask] = useState<any>(null)

  const handleSelectExample = (title: string) => {
    setTaskTitle(title)
    setSelectedExample(title)
  }

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return

    setIsCreating(true)
    
    // Simulate task creation (in real implementation, this would call the API)
    setTimeout(() => {
      setCreatedTask({
        title: taskTitle,
        status: 'not_started',
        priority: 'medium',
        category: selectedExample ? EXAMPLE_TASKS.find(t => t.title === selectedExample)?.category : 'work',
      })
      setIsCreating(false)
      updateData({ first_task_created: true, first_task_title: taskTitle })
    }, 800)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCreateTask()
    }
  }

  return (
    <div className="space-y-8">
      {!createdTask ? (
        <>
          {/* Task Input */}
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="What would you like to accomplish?"
                className="w-full h-12 px-4 pr-12 bg-background border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                disabled={isCreating}
              />
              {taskTitle && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Sparkles size={16} className="text-primary/50" />
                </div>
              )}
            </div>

            <Button
              onClick={handleCreateTask}
              disabled={!taskTitle.trim() || isCreating}
              className="w-full rounded-full"
              size="lg"
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Plus size={16} />
                  </motion.div>
                  Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plus size={16} />
                  Create Task
                </span>
              )}
            </Button>
          </div>

          {/* Example Tasks */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Or try an example:
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_TASKS.map((task) => (
                <button
                  key={task.title}
                  onClick={() => handleSelectExample(task.title)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedExample === task.title
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {task.title}
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="p-4 bg-muted/50 rounded-xl border border-border/50 space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <span className="font-semibold text-sm block">Type your task</span>
                <span className="text-xs text-muted-foreground">Be specific about what you want to accomplish</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <span className="font-semibold text-sm block">AI will schedule it</span>
                <span className="text-xs text-muted-foreground">Verve finds the best time slot automatically</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <span className="font-semibold text-sm block">Focus and complete</span>
                <span className="text-xs text-muted-foreground">Track your progress and build momentum</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Success State */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 py-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto"
          >
            <CheckCircle2 size={40} className="text-green-500" />
          </motion.div>
          
          <div className="space-y-2">
            <h4 className="text-xl font-bold">Task Created!</h4>
            <p className="text-muted-foreground text-sm">
              "{createdTask.title}" has been added to your schedule
            </p>
          </div>

          <div className="p-4 bg-muted/50 rounded-xl border border-border/50 text-left">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{createdTask.title}</span>
              <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                createdTask.priority === 'critical' ? 'bg-destructive/10 text-destructive' :
                createdTask.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                createdTask.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                'bg-green-500/10 text-green-500'
              }`}>
                {createdTask.priority}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">
                {createdTask.category}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                Scheduled by AI
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Continue to learn keyboard shortcuts and power features
          </p>
        </motion.div>
      )}
    </div>
  )
}
