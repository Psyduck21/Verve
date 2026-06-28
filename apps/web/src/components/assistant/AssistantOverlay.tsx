"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Sparkles, CalendarClock, AlarmClockOff, Brain, LayoutList, Check, XCircle, Loader2, Plus, Trash2, Edit2, Save, ThumbsUp, ThumbsDown } from "lucide-react"
import { apiClient } from "@/utils/apiClient"
import { useTasks } from "@/hooks/useTasks"
import { cn } from "@/lib/utils"

// Quick-action based conversational AI panel. This content is the merged
// AIPanel behaviour (keeps chat + quick actions) and will replace the
// previous AssistantOverlay implementation.

type MessageRole = "user" | "ai" | "plan"

interface Message {
    id: string
    role: MessageRole
    content: string
    ts: Date
    plan?: any
    isEditing?: boolean
    feedback?: 'positive' | 'negative' | null
}

const QUICK_ACTIONS = [
    { icon: CalendarClock, label: "Clear my afternoon" },
    { icon: Brain, label: "Add deep work block" },
    { icon: AlarmClockOff, label: "Reschedule conflicts" },
    { icon: LayoutList, label: "Summarize my day" },
]

const INITIAL_MESSAGES: Message[] = [
    {
        id: "welcome",
        role: "ai",
        content: "Hi! I'm Verve AI. I can reschedule your calendar, resolve conflicts, or help you plan your day. What would you like me to do?",
        ts: new Date(),
    },
]

interface AssistantOverlayProps {
    open: boolean
    onClose: () => void
    enabled?: boolean
}

export function AssistantOverlay({ open, onClose, enabled = false }: AssistantOverlayProps) {
    if (!enabled || !open) return null

    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
    const [input, setInput] = useState("")
    const [isTyping, setIsTyping] = useState(false)
    const [isExecuting, setIsExecuting] = useState(false)
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
    const [editedActions, setEditedActions] = useState<any[]>([])
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const { data: tasks = [] } = useTasks()

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 300)
    }, [open])

    const sendMessage = async (text: string) => {
        if (!text.trim()) return

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim(), ts: new Date() }
        setMessages((prev) => [...prev, userMsg])
        setInput("")
        setIsTyping(true)

        try {
            // Use the new plan/execute pattern
            const context = {
                tasks: tasks.slice(0, 20).map(t => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    is_time_locked: t.is_time_locked,
                })),
                conversation_history: messages.slice(-10).map(m => ({
                    role: m.role === 'plan' ? 'ai' : m.role,
                    content: m.content
                }))
            }
            
            const res = await apiClient.ai.assistantPlan(text.trim(), context)

            if (res.success && res.data) {
                const plan = res.data
                const planMsg: Message = { 
                    id: (Date.now() + 1).toString(), 
                    role: "plan", 
                    content: plan.summary || "Here's what I can do for you:", 
                    ts: new Date(),
                    plan: plan
                }
                setMessages((prev) => [...prev, planMsg])
            } else {
                throw new Error(res.error?.message || "Failed to generate plan")
            }
        } catch (error: any) {
            // Fallback to direct execution if plan generation fails
            console.log("Plan generation failed, falling back to direct execution:", error.message)
            try {
                const res = await apiClient.ai.rescheduleTasks(text.trim(), tasks)

                let replyText = "I've processed your request."
                if (res.success && res.data) {
                    const actions = res.data
                    replyText = `I found ${actions.length} changes to make based on your request. Check your calendar.`
                }

                const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "ai", content: replyText, ts: new Date() }
                setMessages((prev) => [...prev, aiMsg])
            } catch (fallbackError: any) {
                setMessages((prev) => [
                    ...prev,
                    { id: (Date.now() + 1).toString(), role: "ai", content: "Sorry, I couldn't process your request: " + fallbackError.message, ts: new Date() },
                ])
            }
        } finally {
            setIsTyping(false)
        }
    }

    const executePlan = async (plan: any) => {
        // Validate plan before execution
        const validation = validatePlan(plan)
        if (!validation.valid) {
            setMessages((prev) => [
                ...prev,
                { id: (Date.now() + 1).toString(), role: "ai", content: "Plan validation failed:\n" + validation.errors.join("\n"), ts: new Date() },
            ])
            return
        }

        setIsExecuting(true)
        try {
            const res = await apiClient.ai.assistantExecute(plan.plan_id, plan.actions)
            
            let replyText = "Plan executed successfully!"
            if (res.success && res.data) {
                const results = res.data.results
                const successful = results.filter((r: any) => r.success).length
                const failed = results.filter((r: any) => !r.success).length
                replyText = `Executed ${successful} actions successfully${failed > 0 ? ` (${failed} failed)` : ''}. Check your calendar for changes.`
                
                // Log successful execution for analytics
                console.log(`[AI Panel] Plan executed: ${plan.plan_id}, Actions: ${plan.actions.length}, Success: ${successful}, Failed: ${failed}`)
            }

            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "ai", content: replyText, ts: new Date() }
            setMessages((prev) => [...prev, aiMsg])
        } catch (error: any) {
            console.error(`[AI Panel] Plan execution failed: ${plan.plan_id}`, error)
            setMessages((prev) => [
                ...prev,
                { id: (Date.now() + 1).toString(), role: "ai", content: "Sorry, I couldn't execute the plan: " + error.message, ts: new Date() },
            ])
        } finally {
            setIsExecuting(false)
        }
    }

    const rejectPlan = (messageId: string) => {
        // Log plan rejection for analytics
        console.log(`[AI Panel] Plan rejected: ${messageId}`)
        
        setMessages((prev) => [
            ...prev,
            { id: (Date.now() + 1).toString(), role: "ai", content: "Plan rejected. Let me know if you'd like me to try a different approach.", ts: new Date() },
        ])
    }

    const startEditingPlan = (messageId: string, plan: any) => {
        setEditingPlanId(messageId)
        setEditedActions(JSON.parse(JSON.stringify(plan.actions || [])))
    }

    const cancelEditing = () => {
        setEditingPlanId(null)
        setEditedActions([])
    }

    const updateAction = (index: number, field: string, value: string) => {
        const newActions = [...editedActions]
        if (!newActions[index].payload) {
            newActions[index].payload = {}
        }
        newActions[index].payload[field] = value
        setEditedActions(newActions)
    }

    const addAction = () => {
        const newAction = {
            type: "CREATE_TASK",
            title: "New action",
            details: "Add details...",
            payload: {
                title: "New task",
                priority: "medium",
                category: "work"
            }
        }
        setEditedActions([...editedActions, newAction])
    }

    const removeAction = (index: number) => {
        setEditedActions(editedActions.filter((_, i) => i !== index))
    }

    const savePlan = (messageId: string) => {
        setMessages((prev) => prev.map(msg => {
            if (msg.id === messageId && msg.plan) {
                return {
                    ...msg,
                    plan: {
                        ...msg.plan,
                        actions: editedActions
                    }
                }
            }
            return msg
        }))
        setEditingPlanId(null)
        setEditedActions([])
    }

    const submitFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
        setMessages((prev) => prev.map(msg => {
            if (msg.id === messageId) {
                return { ...msg, feedback }
            }
            return msg
        }))
        
        // Log feedback for analytics
        console.log(`[AI Panel] Feedback submitted: ${messageId}, Type: ${feedback}`)
        
        // In production, this would send to backend for storage
        // await apiClient.ai.submitFeedback(messageId, feedback)
    }

    const validatePlan = (plan: any): { valid: boolean; errors: string[] } => {
        const errors: string[] = []
        
        if (!plan.actions || plan.actions.length === 0) {
            errors.push("Plan must have at least one action")
        }

        plan.actions?.forEach((action: any, idx: number) => {
            if (!action.type) {
                errors.push(`Action ${idx + 1}: Missing action type`)
            }
            if (!action.title) {
                errors.push(`Action ${idx + 1}: Missing title`)
            }
            
            // Validate specific action types
            if (action.type === 'SCHEDULE_TASK' || action.type === 'UPDATE_TASK') {
                if (!action.payload?.task_id) {
                    errors.push(`Action ${idx + 1}: Missing task_id for ${action.type}`)
                }
            }
            if (action.type === 'SCHEDULE_TASK') {
                if (!action.payload?.scheduled_at) {
                    errors.push(`Action ${idx + 1}: Missing scheduled_at for SCHEDULE_TASK`)
                }
            }
        })

        return { valid: errors.length === 0, errors }
    }

    const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage(input)
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div key="ai-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={onClose} />

                    <motion.aside
                        key="ai-panel"
                        initial={{ x: 380, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 380, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed right-0 top-0 bottom-0 w-[380px] z-50 flex flex-col bg-card border-l border-border shadow-island-lg"
                        data-purpose="ai-panel"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Sparkles className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">Verve AI</p>
                                    <p className="text-[10px] font-medium text-muted-foreground">Calendar assistant</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="px-4 py-3 border-b border-border">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Quick actions</p>
                            <div className="flex flex-wrap gap-1.5">
                                {QUICK_ACTIONS.map(({ icon: IconComp, label }) => (
                                    <motion.button
                                        key={label}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => sendMessage(label)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors border border-border"
                                    >
                                        <IconComp className="text-primary" />
                                        {label}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
                            {messages.map((msg) => (
                                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5", msg.role === "ai" || msg.role === "plan" ? "bg-primary/10" : "bg-muted border border-border")}>
                                        {msg.role === "ai" || msg.role === "plan" ? <Sparkles className="text-primary" /> : <span className="text-[9px] font-bold text-muted-foreground">U</span>}
                                    </div>

                                    <div className={cn("max-w-[80%]", msg.role === "ai" ? "bg-muted text-foreground rounded-tl-sm font-medium px-3 py-2 rounded-2xl text-sm leading-relaxed" : msg.role === "plan" ? "bg-muted/50 border border-border rounded-tl-sm px-3 py-2 rounded-2xl" : "bg-primary text-primary-foreground rounded-tr-sm font-medium px-3 py-2 rounded-2xl text-sm leading-relaxed")}>
                                        <div className="text-sm leading-relaxed">{msg.content}</div>
                                        
                                        {msg.role === "ai" && !msg.feedback && (
                                            <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => submitFeedback(msg.id, 'positive')}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-[hsl(var(--status-done))] hover:bg-[hsl(var(--status-done)/0.15)] rounded transition-colors"
                                                >
                                                    <ThumbsUp size={12} />
                                                    Helpful
                                                </motion.button>
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => submitFeedback(msg.id, 'negative')}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/15 rounded transition-colors"
                                                >
                                                    <ThumbsDown size={12} />
                                                    Not helpful
                                                </motion.button>
                                            </div>
                                        )}
                                        
                                        {msg.role === "plan" && msg.plan && (
                                            <div className="mt-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                        Planned Actions ({editingPlanId === msg.id ? editedActions.length : (msg.plan.actions?.length || 0)})
                                                    </div>
                                                    {editingPlanId !== msg.id && (
                                                        <motion.button
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => startEditingPlan(msg.id, msg.plan)}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors"
                                                        >
                                                            <Edit2 size={12} />
                                                            Edit
                                                        </motion.button>
                                                    )}
                                                </div>
                                                
                                                <div className="space-y-1.5">
                                                    {(editingPlanId === msg.id ? editedActions : msg.plan.actions)?.map((action: any, idx: number) => (
                                                        <div key={idx} className={cn("flex items-start gap-2 text-xs rounded-lg p-2 border border-border", editingPlanId === msg.id ? "bg-background" : "bg-background/50")}>
                                                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                                                <span className="text-[9px] font-bold text-primary">{idx + 1}</span>
                                                            </div>
                                                            <div className="flex-1 space-y-1.5">
                                                                {editingPlanId === msg.id ? (
                                                                    <>
                                                                        <input
                                                                            type="text"
                                                                            value={action.title || ""}
                                                                            onChange={(e) => updateAction(idx, "title", e.target.value)}
                                                                            className="w-full bg-background border border-border rounded px-2 py-1 text-foreground text-xs focus:outline-none focus:border-primary"
                                                                            placeholder="Action title"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            value={action.details || ""}
                                                                            onChange={(e) => updateAction(idx, "details", e.target.value)}
                                                                            className="w-full bg-background border border-border rounded px-2 py-1 text-foreground text-xs focus:outline-none focus:border-primary"
                                                                            placeholder="Action details"
                                                                        />
                                                                        {action.payload && (
                                                                            <div className="space-y-1">
                                                                                <input
                                                                                    type="text"
                                                                                    value={action.payload.title || ""}
                                                                                    onChange={(e) => updateAction(idx, "title", e.target.value)}
                                                                                    className="w-full bg-background border border-border rounded px-2 py-1 text-foreground text-xs focus:outline-none focus:border-primary"
                                                                                    placeholder="Task title"
                                                                                />
                                                                                <select
                                                                                    value={action.payload.priority || "medium"}
                                                                                    onChange={(e) => updateAction(idx, "priority", e.target.value)}
                                                                                    className="w-full bg-background border border-border rounded px-2 py-1 text-foreground text-xs focus:outline-none focus:border-primary"
                                                                                >
                                                                                    <option value="critical">Critical</option>
                                                                                    <option value="high">High</option>
                                                                                    <option value="medium">Medium</option>
                                                                                    <option value="low">Low</option>
                                                                                </select>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="font-medium text-foreground">{action.title}</div>
                                                                        <div className="text-muted-foreground">{action.details}</div>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {editingPlanId === msg.id && (
                                                                <motion.button
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => removeAction(idx)}
                                                                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </motion.button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                
                                                {editingPlanId === msg.id && (
                                                    <motion.button
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={addAction}
                                                        className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors border border-dashed border-border"
                                                    >
                                                        <Plus size={12} />
                                                        Add Action
                                                    </motion.button>
                                                )}
                                                
                                                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                                                    {editingPlanId === msg.id ? (
                                                        <>
                                                            <motion.button
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => savePlan(msg.id)}
                                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                                            >
                                                                <Save size={12} />
                                                                Save Changes
                                                            </motion.button>
                                                            <motion.button
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={cancelEditing}
                                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors border border-border"
                                                            >
                                                                Cancel
                                                            </motion.button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <motion.button
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => executePlan(msg.plan)}
                                                                disabled={isExecuting}
                                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                                                            >
                                                                {isExecuting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                                {isExecuting ? "Executing..." : "Execute Plan"}
                                                            </motion.button>
                                                            <motion.button
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => rejectPlan(msg.id)}
                                                                disabled={isExecuting}
                                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-muted text-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/80 transition-colors border border-border"
                                                            >
                                                                <XCircle size={12} />
                                                                Reject
                                                            </motion.button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            <AnimatePresence>{isTyping && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2 items-center">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Sparkles className="text-primary" />
                                    </div>
                                    <div className="bg-muted px-3 py-2 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                                        {[0, 1, 2].map((i) => (
                                            <motion.span key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}</AnimatePresence>

                            <div ref={bottomRef} />
                        </div>

                        <div className="px-4 py-4 border-t border-border">
                            <div className="flex items-end gap-2 bg-muted rounded-xl border border-border px-3 py-2">
                                <textarea ref={inputRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Ask Verve AI..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none max-h-28 scrollbar-thin font-medium" style={{ scrollbarWidth: "none" }} />
                                <motion.button whileTap={{ scale: 0.9 }} onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping} className="p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shrink-0 shadow-sm">
                                    <Send />
                                </motion.button>
                            </div>
                            <p className="text-[10px] font-medium text-muted-foreground text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    )
}
