"use client"

import { useState } from "react"
import { useCreateTask } from "@/hooks/useTasks"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarIcon, Clock, CheckCircle2 } from "lucide-react"

interface NewTaskSheetProps {
    isOpen: boolean
    onClose: () => void
}

export function NewTaskSheet({ isOpen, onClose }: NewTaskSheetProps) {
    const { mutateAsync: createTask, isPending } = useCreateTask()
    
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [priority, setPriority] = useState("medium")
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
    const [time, setTime] = useState(() => {
        const now = new Date()
        now.setHours(now.getHours() + 1)
        now.setMinutes(0)
        return now.toTimeString().slice(0, 5)
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        try {
            const scheduledAt = new Date(`${date}T${time}:00`).toISOString()
            
            await createTask({
                title,
                description,
                priority: priority as any,
                scheduled_at: scheduledAt,
                status: "not_started",
                estimated_duration_minutes: 30,
                is_time_locked: false,
            } as any)
            
            // Reset form and close
            setTitle("")
            setDescription("")
            setPriority("medium")
            onClose()
        } catch (error) {
            console.error("Failed to create task:", error)
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="w-full sm:max-w-md bg-background border-border shadow-island p-0 overflow-y-auto">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 pb-0">
                        <SheetHeader>
                            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                                <CheckCircle2 className="text-primary" />
                                Create New Task
                            </SheetTitle>
                            <SheetDescription className="text-muted-foreground">
                                Add a new task to your schedule. AI will help optimize your routine.
                            </SheetDescription>
                        </SheetHeader>
                    </div>

                    <div className="flex-1 p-6 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-foreground">Task Title</Label>
                            <Input 
                                id="title" 
                                placeholder="E.g. Review Q3 Planning Doc" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="bg-muted/50 border-border focus:ring-primary focus:border-primary"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-foreground">Description (Optional)</Label>
                            <Textarea 
                                id="description" 
                                placeholder="Add any details or links..." 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-muted/50 border-border focus:ring-primary focus:border-primary resize-none h-24"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date" className="text-foreground flex items-center gap-1">
                                    <CalendarIcon size={14} /> Date
                                </Label>
                                <Input 
                                    id="date" 
                                    type="date" 
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="bg-muted/50 border-border focus:ring-primary focus:border-primary"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="time" className="text-foreground flex items-center gap-1">
                                    <Clock size={14} /> Time
                                </Label>
                                <Input 
                                    id="time" 
                                    type="time" 
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="bg-muted/50 border-border focus:ring-primary focus:border-primary"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-foreground">Priority</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger className="bg-muted/50 border-border focus:ring-primary">
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    <SelectItem value="low">Low Priority</SelectItem>
                                    <SelectItem value="medium">Medium Priority</SelectItem>
                                    <SelectItem value="high">High Priority</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="p-6 pt-4 border-t border-border bg-muted/20 flex justify-end gap-3">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onClose}
                            className="bg-background hover:bg-muted border-border text-foreground"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isPending || !title.trim()}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {isPending ? "Creating..." : "Create Task"}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    )
}
