"use client"

import * as React from "react"
import { Sparkles, Loader2, ArrowRight } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useTasks, useUpdateTask, useCreateTask, useDeleteTask } from "@/hooks/useTasks"
import { apiClient } from "@/utils/apiClient"

export function UniversalOmnibox() {
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [lastActions, setLastActions] = React.useState<string[]>([])
  
  const { data: tasks = [] } = useTasks()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const deleteTask = useDeleteTask()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSubmit = async (command: string) => {
    if (!command.trim() || isSubmitting) return
    setIsSubmitting(true)
    setLastActions([])
    
    try {
      const localTimeString = new Date().toString()
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      
      const res = await apiClient.ai.omnibox(command, tasks, localTimeString, timezone)
      
      if (res.success && res.data) {
        const actions = res.data
        let actionMessages = []
        
        await Promise.all(actions.map(async (action: any) => {
          switch (action.action) {
            case 'CREATE':
              await createTask.mutateAsync({
                title: action.new_title,
                scheduled_at: action.new_scheduled_at || new Date().toISOString(),
                priority: action.new_priority || 'medium',
                estimated_duration_minutes: action.new_duration_minutes || 30,
                status: "not_started"
              })
              actionMessages.push(`Created: ${action.new_title}`)
              break
            case 'MOVE':
            case 'UPDATE':
              if (action.task_id) {
                const updates: any = { id: action.task_id }
                if (action.new_scheduled_at) updates.scheduled_at = action.new_scheduled_at
                if (action.new_title) updates.title = action.new_title
                if (action.new_priority) updates.priority = action.new_priority
                if (action.new_duration_minutes) updates.estimated_duration_minutes = action.new_duration_minutes
                await updateTask.mutateAsync(updates)
                actionMessages.push(`Updated a task`)
              }
              break
            case 'CANCEL':
              if (action.task_id) {
                await deleteTask.mutateAsync(action.task_id)
                actionMessages.push(`Cancelled a task`)
              }
              break
          }
        }))
        
        setInput("")
        setOpen(false)
        // You could trigger a toast here
      }
    } catch (error) {
      console.error("Omnibox error:", error)
      setLastActions(["Error processing your request."])
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault()
      handleSubmit(input)
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a command... e.g. 'Push afternoon tasks back' or 'Team sync tomorrow'" 
        value={input}
        onValueChange={setInput}
        onKeyDown={handleKeyDown}
        disabled={isSubmitting}
      />
      <CommandList>
        {isSubmitting ? (
          <CommandEmpty className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI is organizing your calendar...</p>
          </CommandEmpty>
        ) : input.trim() === "" ? (
          <CommandEmpty>Start typing to manage your calendar.</CommandEmpty>
        ) : (
          <CommandGroup heading="AI Actions">
            <CommandItem 
              onSelect={() => handleSubmit(input)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Ask AI: "{input}"</span>
              <ArrowRight className="h-4 w-4 ml-auto opacity-50" />
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
