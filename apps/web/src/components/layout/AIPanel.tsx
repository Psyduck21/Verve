"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    X,
    Send,
    Sparkles,
    CalendarClock,
    AlarmClockOff,
    Brain,
    LayoutList,
} from "lucide-react"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"
import { apiClient } from "@/utils/apiClient"
import { useTasks } from "@/hooks/useTasks"

// ── Types ──────────────────────────────────────────────────────
type MessageRole = "user" | "ai"

interface Message {
    id:      string
    role:    MessageRole
    content: string
    ts:      Date
}

const QUICK_ACTIONS = [
    { icon: CalendarClock,  label: "Clear my afternoon"      },
    { icon: Brain,          label: "Add deep work block"     },
    { icon: AlarmClockOff,  label: "Reschedule conflicts"    },
    { icon: LayoutList,     label: "Summarize my day"        },
]

const INITIAL_MESSAGES: Message[] = [
    {
        id:      "welcome",
        role:    "ai",
        content: "Hi! I'm Verve AI. I can reschedule your calendar, resolve conflicts, or help you plan your day. What would you like me to do?",
        ts:      new Date(),
    },
]

// ── Component ─────────────────────────────────────────────────
interface AIPanelProps {
    open:    boolean
    onClose: () => void
}

export function AIPanel({ open, onClose }: AIPanelProps) {
    const [messages, setMessages]   = useState<Message[]>(INITIAL_MESSAGES)
    const [input, setInput]         = useState("")
    const [isTyping, setIsTyping]   = useState(false)
    const bottomRef                 = useRef<HTMLDivElement>(null)
    const inputRef                  = useRef<HTMLTextAreaElement>(null)
    const { data: tasks = [] }      = useTasks()

    // Scroll to bottom on new message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Focus input when panel opens
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 300)
        }
    }, [open])

    const sendMessage = async (text: string) => {
        if (!text.trim()) return

        const userMsg: Message = {
            id:      Date.now().toString(),
            role:    "user",
            content: text.trim(),
            ts:      new Date(),
        }
        setMessages((prev) => [...prev, userMsg])
        setInput("")
        setIsTyping(true)

        // Call AI endpoint via apiClient
        try {
            // We pass the prompt to the reschedule endpoint along with context
            const res = await apiClient.ai.rescheduleTasks(
                tasks.map(t => t.id), 
                JSON.stringify({ command: text.trim(), tasks })
            )
            
            let replyText = "I've processed your request."
            if (res.success && res.data) {
                const actions = res.data
                replyText = `I found ${actions.length} changes to make based on your request. Check your calendar.`
            }

            const aiMsg: Message = {
                id:      (Date.now() + 1).toString(),
                role:    "ai",
                content: replyText,
                ts:      new Date(),
            }
            setMessages((prev) => [...prev, aiMsg])
        } catch (error: any) {
            setMessages((prev) => [
                ...prev,
                {
                    id:      (Date.now() + 1).toString(),
                    role:    "ai",
                    content: "Sorry, I couldn't connect to the AI: " + error.message,
                    ts:      new Date(),
                },
            ])
        } finally {
            setIsTyping(false)
        }
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
                    {/* Backdrop (transparent — panel is supplemental, not modal) */}
                    <motion.div
                        key="ai-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={onClose}
                    />

                    {/* Slide-in panel */}
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
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Icon icon={Sparkles} size="sm" className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">Verve AI</p>
                                    <p className="text-[10px] font-medium text-muted-foreground">Calendar assistant</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <Icon icon={X} size="sm" />
                            </button>
                        </div>

                        {/* Quick actions */}
                        <div className="px-4 py-3 border-b border-border">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                Quick actions
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {QUICK_ACTIONS.map(({ icon, label }) => (
                                    <motion.button
                                        key={label}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => sendMessage(label)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors border border-border"
                                    >
                                        <Icon icon={icon} size="sm" className="text-primary" />
                                        {label}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* Chat messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={cn(
                                        "flex gap-2",
                                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                    )}
                                >
                                    {/* Avatar */}
                                    <div
                                        className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                            msg.role === "ai"
                                                ? "bg-primary/10"
                                                : "bg-muted border border-border"
                                        )}
                                    >
                                        {msg.role === "ai" ? (
                                            <Icon icon={Sparkles} size="sm" className="text-primary" strokeWidth={1.5} />
                                        ) : (
                                            <span className="text-[9px] font-bold text-muted-foreground">U</span>
                                        )}
                                    </div>

                                    {/* Bubble */}
                                    <div
                                        className={cn(
                                            "max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed",
                                            msg.role === "ai"
                                                ? "bg-muted text-foreground rounded-tl-sm font-medium"
                                                : "bg-primary text-primary-foreground rounded-tr-sm font-medium"
                                        )}
                                    >
                                        {msg.content}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Typing indicator */}
                            <AnimatePresence>
                                {isTyping && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex gap-2 items-center"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <Icon icon={Sparkles} size="sm" className="text-primary" />
                                        </div>
                                        <div className="bg-muted px-3 py-2 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                                            {[0, 1, 2].map((i) => (
                                                <motion.span
                                                    key={i}
                                                    className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                                                    animate={{ y: [0, -4, 0] }}
                                                    transition={{
                                                        duration: 0.6,
                                                        repeat: Infinity,
                                                        delay: i * 0.15,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div ref={bottomRef} />
                        </div>

                        {/* Input bar */}
                        <div className="px-4 py-4 border-t border-border">
                            <div className="flex items-end gap-2 bg-muted rounded-xl border border-border px-3 py-2">
                                <textarea
                                    ref={inputRef}
                                    rows={1}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKey}
                                    placeholder="Ask Verve AI..."
                                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none max-h-28 scrollbar-thin font-medium"
                                    style={{ scrollbarWidth: "none" }}
                                />
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => sendMessage(input)}
                                    disabled={!input.trim() || isTyping}
                                    className="p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shrink-0 shadow-sm"
                                >
                                    <Icon icon={Send} size="sm" />
                                </motion.button>
                            </div>
                            <p className="text-[10px] font-medium text-muted-foreground text-center mt-2">
                                Press Enter to send · Shift+Enter for new line
                            </p>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    )
}
