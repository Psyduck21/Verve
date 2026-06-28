// @ts-nocheck
"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"
import {
    Sparkles, Calendar, Tag, AlertCircle, CornerDownLeft, ArrowUp, ArrowDown,
    Clock, AlignLeft, Lock, Loader2, LayoutDashboard, Settings, Download, LogOut,
    Moon, Sun, Monitor, RefreshCcw, Plus, ArrowRight, Wand2
} from "lucide-react"
import { KEYBINDINGS } from "@/config/keybindings"
import { isHotkey } from "@/utils/keyboard"
import { useCreateTask, useUpdateTask, useTasks } from "@/hooks/useTasks"
import { useTaskStore } from "@/store/useTaskStore"
import { useRoutines } from "@/hooks/useRoutines"
import { useCategories } from "@/hooks/useCategories"
import { useTemplates } from "@/hooks/useTemplates"

// ── Types ──────────────────────────────────────────────────────────────────────
type ModalMode = "task" | "ai" | "command"

interface ParsedTask {
    priority: string | null
    category: string | null
    duration: number | null
    durationStr: string | null
    description: string | null
    routineName: string | null
    templateName: string | null
    isTimeLocked: boolean
    cleanTitle: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const PRIORITIES = ["critical", "high", "medium", "low"]
const DURATIONS = ["15m", "30m", "45m", "1h", "1.5h", "2h", "3h", "4h", "8h"]

const parseInput = (text: string): ParsedTask => {
    let cleanTitle = text
    let priority = null, category = null, duration = null, durationStr = null, description = null, routineName = null, isTimeLocked = false

    const descMatch = cleanTitle.match(/\/\/(.*)$/)
    if (descMatch) { description = descMatch[1].trim(); cleanTitle = cleanTitle.replace(/\/\/(.*)$/, "").trim() }

    const words = cleanTitle.split(/\s+/).filter(Boolean)
    const remaining = []
    for (let i = 0; i < words.length; i++) {
        const word = words[i]
        if (word === "-r" && words[i + 1]) {
            routineName = words[++i]
            continue
        }
        if (word.startsWith("-r") && word.length > 2) {
            routineName = word.substring(2)
            continue
        }
        if (word === "-l" || word.toLowerCase() === "-lock") {
            isTimeLocked = true
            continue
        }
        if (word.startsWith("!") && word.length > 1) priority = word.substring(1).toLowerCase()
        else if (word.startsWith("#") && word.length > 1) category = word.substring(1).toLowerCase()
        else if (word.startsWith("~") && word.length > 1) {
            const d = word.substring(1).toLowerCase()
            durationStr = d
            if (d.endsWith("m")) duration = parseInt(d)
            else if (d.endsWith("h")) duration = parseFloat(d) * 60
        } else remaining.push(word)
    }
    return { priority, category, duration, durationStr, description, routineName, isTimeLocked, cleanTitle: remaining.join(" ").trim() }
}

// ── AI Mode quick actions ───────────────────────────────────────────────────
const AI_QUICK_ACTIONS = [
    { label: "Clear my afternoon", command: "Clear my afternoon" },
    { label: "Defragment my calendar", command: "Defragment my calendar" },
    { label: "Reschedule my 3pm call to 4pm", command: "Reschedule my 3pm call to 4pm" },
    { label: "Move my deep work block to tomorrow morning", command: "Move my deep work block to tomorrow morning" },
]

// ── Component ──────────────────────────────────────────────────────────────────
interface UniversalModalProps {
    open: boolean
    initialMode?: ModalMode
    onClose: () => void
}

export function UniversalModal({ open, initialMode = "task", onClose }: UniversalModalProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const cmdListRef = useRef<HTMLDivElement>(null)
    const [mode, setMode] = useState<ModalMode>(initialMode)
    const [input, setInput] = useState("")
    const [popupType, setPopupType] = useState<"priority" | "category" | "duration" | "routine" | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [cmdSelectedIndex, setCmdSelectedIndex] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [aiMode, setAiMode] = useState(false) // true = natural language omnibox mode
    const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null)

    const router = useRouter()
    const { setTheme } = useTheme()
    const createTaskMutation = useCreateTask()
    const updateTask = useUpdateTask()
    const { data: tasks = [] } = useTasks()
    const { data: routines = [] } = useRoutines()
    const { data: categories = [] } = useCategories()

    const { data: profileResponse } = useQuery({
        queryKey: ["profile"],
        queryFn: apiClient.users.getProfile,
        enabled: open && mode === "command",
    })

    const defaultCategories = [
        { name: "work", color: "#ef4444" },
        { name: "personal", color: "#3b82f6" },
        { name: "health", color: "#10b981" },
    ]
    const displayCategories = categories.length > 0 ? categories : defaultCategories

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setMode(initialMode)
            setInput("")
            setPopupType(null)
            setSearchQuery("")
            setSelectedIndex(0)
            setCmdSelectedIndex(0)
            setIsSubmitting(false)
            setAiMode(initialMode === "ai")
            setSelectedRoutineId(null)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [open, initialMode])

    // Listen for global open events
    useEffect(() => {
        const handleOpenTask = () => { /* Handled by parent */ }
        window.addEventListener("open_add_task", handleOpenTask)
        return () => window.removeEventListener("open_add_task", handleOpenTask)
    }, [])

    // ── Task Mode Filtered Options ──────────────────────────────────────────
    const filteredOptions =
        popupType === "priority" ? PRIORITIES.filter(p => p.includes(searchQuery))
            : popupType === "category" ? displayCategories.filter((c: any) => c.name.toLowerCase().includes(searchQuery))
                : popupType === "duration" ? DURATIONS.filter(d => d.includes(searchQuery))
                    : popupType === "routine" ? routines.filter((r: any) => r.title.toLowerCase().includes(searchQuery))
                        : []

    useEffect(() => {
        if (filteredOptions.length > 0 && selectedIndex >= filteredOptions.length) {
            setSelectedIndex(filteredOptions.length - 1)
        }
    }, [filteredOptions.length, selectedIndex])

    // ── Command Mode Items ──────────────────────────────────────────────────
    const commandItems = [
        {
            group: "Navigation", items: [
                { icon: LayoutDashboard, label: "Go to Dashboard", shortcut: "G D", action: () => router.push("/dashboard") },
                { icon: Calendar, label: "Go to Calendar", shortcut: "G C", action: () => router.push("/calendar") },
                { icon: Plus, label: "Go to Tasks", shortcut: "G T", action: () => router.push("/tasks") },
                { icon: Download, label: "Go to Inbox", shortcut: "G I", action: () => router.push("/inbox") },
                { icon: Settings, label: "Go to Settings", shortcut: "G S", action: () => router.push("/settings") },
                { icon: Download, label: "Template Library", shortcut: "G L / T L", action: () => router.push("/templates") },
            ]
        },
        {
            group: "AI Actions", items: [
                { icon: Wand2, label: "Defragment my calendar", action: () => runAICommand("Defragment my calendar") },
                { icon: RefreshCcw, label: "Push afternoon to tomorrow", action: () => runAICommand("Push all afternoon tasks to tomorrow") },
            ]
        },
        {
            group: "Preferences", items: [
                { icon: Sun, label: "Light Mode", action: () => setTheme("light") },
                { icon: Moon, label: "Dark Mode", action: () => setTheme("dark") },
                { icon: Monitor, label: "System Theme", action: () => setTheme("system") },
            ]
        },
        {
            group: "Account", items: [
                { icon: Download, label: "Export My Data", action: () => window.open("/v1/users/export", "_blank") },
                { icon: LogOut, label: "Log out", action: () => router.push("/api/auth/logout") },
            ]
        },
    ]

    const filteredCommandItems = commandItems.map(g => ({
        ...g,
        items: g.items.filter(i => i.label.toLowerCase().includes(input.toLowerCase())),
    })).filter(g => g.items.length > 0)

    // Flat list for keyboard nav
    const flatCommandItems = filteredCommandItems.flatMap(g => g.items)

    // Reset cmd selection when search changes
    useEffect(() => {
        setCmdSelectedIndex(0)
    }, [input, mode])

    // Scroll selected item into view
    useEffect(() => {
        if (mode === "command") {
            const el = cmdListRef.current?.querySelector(`[data-cmd-index="${cmdSelectedIndex}"]`)
            el?.scrollIntoView({ block: "nearest" })
        }
    }, [cmdSelectedIndex, mode])

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleClose = () => {
        setInput("")
        setPopupType(null)
        setIsSubmitting(false)
        setAiMode(false)
        onClose()
    }

    const autocomplete = (optionText: string, optionValue?: string | null) => {
        const pos = inputRef.current?.selectionStart || input.length
        const textBeforeCursor = input.slice(0, pos)
        const textAfterCursor = input.slice(pos)
        const match = textBeforeCursor.match(/(?:^|\s)(!|#|~|-r)(\w*)$/)
        if (match) {
            const replaceStart = pos - match[1].length - match[2].length
            const prefix = textBeforeCursor.slice(0, replaceStart)
            const spacer = prefix.length > 0 && !prefix.endsWith(" ") ? " " : ""
            const token = match[1] === "-r" ? "-r" : match[1]
            const newTextBefore = prefix + spacer + token + (optionValue || optionText) + " "
            setInput(newTextBefore + textAfterCursor)
            if (match[1] === "-r") {
                const selectedRoutine = routines.find((r: any) => r.title === (optionValue || optionText))
                if (selectedRoutine) setSelectedRoutineId(selectedRoutine.id)
            }
            setPopupType(null)
            setTimeout(() => {
                inputRef.current?.focus()
                inputRef.current?.setSelectionRange(newTextBefore.length, newTextBefore.length)
            }, 10)
        }
    }

    const resolveRoutineFromInput = (value: string) => {
        const parsed = parseInput(value)
        if (!parsed.routineName) return null
        const normalized = parsed.routineName.toLowerCase()
        return routines.find((routine: any) => {
            const title = routine.title?.toLowerCase() || ""
            return title === normalized || title.includes(normalized)
        })?.id || null
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setInput(val)
        if (mode === "task" && !aiMode) {
            const routineId = resolveRoutineFromInput(val)
            if (routineId) setSelectedRoutineId(routineId)
        }
        if (mode !== "task" || aiMode) return
        const pos = e.target.selectionStart || val.length
        const textBeforeCursor = val.slice(0, pos)
        const match = textBeforeCursor.match(/(?:^|\s)(!|#|~|-r)(\w*)$/)
        if (match) {
            const trigger = match[1]
            const isRoutine = trigger === "-r"
            setPopupType(isRoutine ? "routine" : trigger === "!" ? "priority" : trigger === "#" ? "category" : "duration")
            setSearchQuery(match[2].toLowerCase())
            if (searchQuery !== match[2].toLowerCase()) setSelectedIndex(0)
        } else {
            setPopupType(null)
        }
    }

    const runAICommand = async (command: string) => {
        setIsSubmitting(true)
        handleClose()
        try {
            const localTimeString = new Date().toString()
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            const res = await apiClient.ai.omnibox(command, tasks, localTimeString, timezone)
            if (res.success && res.data) {
                await Promise.all(res.data.map(async (action: any) => {
                    if (action.action === "CREATE") {
                        await createTaskMutation.mutateAsync({
                            title: action.new_title,
                            scheduled_at: action.new_scheduled_at || null,
                            priority: action.new_priority || "medium",
                            estimated_duration_minutes: action.new_duration_minutes || 30,
                            status: "not_started",
                            description: action.description || action.new_description,
                            category: action.category || action.new_category,
                            is_time_locked: action.is_time_locked ?? action.new_is_time_locked ?? false,
                        })
                    } else if (action.action === "MOVE" || action.action === "UPDATE") {
                        if (action.task_id) {
                            const updates: any = { id: action.task_id }
                            if (action.new_scheduled_at) updates.scheduled_at = action.new_scheduled_at
                            if (action.new_title) updates.title = action.new_title
                            if (action.new_priority) updates.priority = action.new_priority
                            if (action.new_duration_minutes) updates.estimated_duration_minutes = action.new_duration_minutes
                            await updateTask.mutateAsync(updates)
                        }
                    } else if (action.action === "CANCEL") {
                        console.warn("AI returned CANCEL action. Skipping cancellation to preserve the task unless user explicitly confirms.")
                    }
                }))
            }
        } catch (err) {
            console.error("AI omnibox error:", err)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSaveTask = async () => {
        if (!input.trim() || isSubmitting) return
        setIsSubmitting(true)

        if (mode === "ai" || aiMode) {
            await runAICommand(input)
            return
        }

        const parsed = parseInput(input)
        const routineIdFromInput = resolveRoutineFromInput(input)
        const effectiveRoutineId = routineIdFromInput || selectedRoutineId
        try {
            const localTimeString = new Date().toString()
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            const aiRes = await apiClient.ai.parseTask(parsed.cleanTitle, localTimeString, timezone)
            if (!aiRes.success || !aiRes.data) throw new Error("Failed to parse task via AI")
            const aiParsed = aiRes.data
            createTaskMutation.mutate({
                title: aiParsed.title || parsed.cleanTitle || "Untitled Task",
                priority: (parsed.priority as any) || aiParsed.priority || "medium",
                category: parsed.category || aiParsed.category || "personal",
                status: "not_started",
                scheduled_at: aiParsed.scheduled_at,
                estimated_duration_minutes: parsed.duration || 30,
                description: parsed.description || undefined,
                routine_id: effectiveRoutineId,
                is_time_locked: parsed.isTimeLocked || false,
            }, { onSuccess: handleClose, onError: (err) => { setIsSubmitting(false); alert("Failed: " + err.message) } })
        } catch {
            const parsed = parseInput(input)
            createTaskMutation.mutate({
                title: parsed.cleanTitle || input,
                priority: (parsed.priority as any) || "medium",
                category: parsed.category || "personal",
                status: "not_started",
                scheduled_at: null,
                estimated_duration_minutes: parsed.duration || 30,
                routine_id: effectiveRoutineId,
                is_time_locked: parsed.isTimeLocked || false,
            }, { onSuccess: handleClose, onError: (err) => { setIsSubmitting(false) } })
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // ── Command mode arrow key navigation ──
        if (mode === "command") {
            if (e.key === "ArrowDown") {
                e.preventDefault()
                setCmdSelectedIndex(p => Math.min(p + 1, flatCommandItems.length - 1))
                return
            }
            if (e.key === "ArrowUp") {
                e.preventDefault()
                setCmdSelectedIndex(p => Math.max(p - 1, 0))
                return
            }
            if (e.key === "Enter" && flatCommandItems.length > 0) {
                e.preventDefault()
                const item = flatCommandItems[cmdSelectedIndex]
                if (item) { handleClose(); item.action() }
                return
            }
        }

        // ── Task mode popup navigation ──
        if (popupType && mode === "task") {
            if (isHotkey(e, KEYBINDINGS.MODALS.CLOSE)) { e.preventDefault(); setPopupType(null); return }
            if (isHotkey(e, KEYBINDINGS.MODALS.NAV_DOWN)) { e.preventDefault(); setSelectedIndex(p => (p + 1) % Math.max(1, filteredOptions.length)); return }
            if (isHotkey(e, KEYBINDINGS.MODALS.NAV_UP)) { e.preventDefault(); setSelectedIndex(p => (p - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length)); return }
            if (isHotkey(e, KEYBINDINGS.MODALS.SELECT_OPTION)) {
                e.preventDefault()
                if (filteredOptions.length > 0) {
                    const opt = filteredOptions[selectedIndex]
                    const label = typeof opt === "string" ? opt : opt.name || opt.title
                    autocomplete(label, typeof opt === "string" ? opt : opt.title || opt.name)
                }
                return
            }
        }

        if (e.key === "Enter" && !e.shiftKey) {
            if (mode === "task" || mode === "ai" || aiMode) {
                e.preventDefault()
                handleSaveTask()
            }
        }
        if (isHotkey(e, KEYBINDINGS.MODALS.CLOSE)) handleClose()

        // Tab switches mode
        if (e.key === "Tab" && !popupType) {
            e.preventDefault()
            const modes: ModalMode[] = ["task", "ai", "command"]
            const currentIndex = modes.indexOf(mode)
            const nextMode = modes[(currentIndex + 1) % modes.length]
            setMode(nextMode)
            setInput("")
            setAiMode(nextMode === "ai")
        }
    }

    if (!open) return null

    const liveParsed = parseInput(input)

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 bg-background/40 backdrop-blur-sm"
                        onClick={handleClose}
                        aria-hidden="true"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="relative w-full max-w-2xl mx-4 bg-card border border-border shadow-island-lg rounded-2xl overflow-visible"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                    >
                        {/* Mode Tabs */}
                        <div className="flex items-center gap-0 px-4 pt-3 pb-0 border-b border-border/60" role="tablist" aria-label="Modal modes">
                            <button
                                onClick={() => { setMode("task"); setInput(""); setAiMode(false); setTimeout(() => inputRef.current?.focus(), 30) }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors ${mode === "task" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                                role="tab"
                                aria-selected={mode === "task"}
                                aria-controls="task-panel"
                                id="task-tab"
                            >
                                <span className="flex items-center gap-1.5"><Sparkles size={11} /> New Task</span>
                            </button>
                            <button
                                onClick={() => { setMode("ai"); setInput(""); setAiMode(true); setTimeout(() => inputRef.current?.focus(), 30) }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors ${mode === "ai" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                                role="tab"
                                aria-selected={mode === "ai"}
                                aria-controls="ai-panel"
                                id="ai-tab"
                            >
                                <span className="flex items-center gap-1.5"><Wand2 size={11} /> AI</span>
                            </button>
                            <button
                                onClick={() => { setMode("command"); setInput(""); setAiMode(false); setTimeout(() => inputRef.current?.focus(), 30) }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors ${mode === "command" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                                role="tab"
                                aria-selected={mode === "command"}
                                aria-controls="command-panel"
                                id="command-tab"
                            >
                                <span className="flex items-center gap-1.5"><Wand2 size={11} /> Commands</span>
                            </button>
                            <div className="ml-auto flex items-center gap-3 text-[10px] text-muted-foreground/50 font-medium pb-1.5">
                                <span>Tab to switch</span>
                            </div>
                        </div>

                        {/* Input Row */}
                        <div className="p-4 pb-2 flex items-center gap-3">
                            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                {mode === "task"
                                    ? <Sparkles size={14} className="text-primary" />
                                    : <Wand2 size={14} className="text-primary" />
                                }
                            </div>
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    mode === "task"
                                        ? aiMode
                                            ? "Try: 'Clear my afternoon' or 'Defragment my calendar'"
                                            : "Review designs tomorrow 10am !high #work ~1h"
                                        : mode === "ai"
                                            ? "Try: 'Clear my afternoon' or 'Defragment my calendar'"
                                            : "Search commands..."
                                }
                                className="w-full bg-transparent border-none outline-none text-foreground text-lg placeholder:text-muted-foreground/60"
                                disabled={isSubmitting}
                                autoComplete="off"
                                aria-label={mode === "task" ? "Task input" : mode === "ai" ? "AI input" : "Command search"}
                                id="modal-title"
                            />
                            {isSubmitting && <Loader2 size={18} className="text-primary animate-spin shrink-0" />}
                        </div>

                        {/* ── TASK MODE ── */}
                        {mode === "task" && (
                            <>
                                {/* Live parse preview */}
                                <div className="px-12 pb-3 min-h-[28px] flex flex-wrap gap-2 items-center">
                                    {liveParsed.priority && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20 capitalize">
                                            <AlertCircle size={10} /> {liveParsed.priority}
                                        </span>
                                    )}
                                    {liveParsed.category && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20 capitalize">
                                            <Tag size={10} /> {liveParsed.category}
                                        </span>
                                    )}
                                    {liveParsed.duration && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                            <Clock size={10} /> {liveParsed.durationStr}
                                        </span>
                                    )}
                                    {liveParsed.description && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-foreground border border-border truncate max-w-[200px]">
                                            <AlignLeft size={10} /> {liveParsed.description}
                                        </span>
                                    )}
                                    {liveParsed.isTimeLocked && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                                            <Lock size={10} /> Locked
                                        </span>
                                    )}
                                    {liveParsed.routineName && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-600 border border-violet-500/20">
                                            <Sparkles size={10} /> {liveParsed.routineName}
                                        </span>
                                    )}
                                    {liveParsed.templateName && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-600 border border-violet-500/20">
                                            <Sparkles size={10} /> {liveParsed.templateName}
                                        </span>
                                    )}
                                    {(!liveParsed.priority && !liveParsed.category && !liveParsed.duration && !liveParsed.description && input.length > 0) && (
                                        <span className="text-[10px] text-muted-foreground/60 italic">AI will auto-detect time, priority & category</span>
                                    )}
                                </div>

                                {/* Dropdown Popover */}
                                <AnimatePresence>
                                    {popupType && filteredOptions.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute left-10 top-[80px] w-64 bg-popover border border-border rounded-xl shadow-island-lg overflow-hidden z-[110]"
                                        >
                                            <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border flex justify-between">
                                                <span>Select {popupType}</span>
                                                <span className="flex items-center"><ArrowUp size={10} /><ArrowDown size={10} /></span>
                                            </div>
                                            <div className="py-1">
                                                {filteredOptions.map((opt: any, idx: number) => {
                                                    const isSelected = idx === selectedIndex
                                                    const label = typeof opt === "string" ? opt : opt.name || opt.title
                                                    const Icon = popupType === "priority" ? AlertCircle : popupType === "duration" ? Clock : popupType === "routine" ? Sparkles : Tag
                                                    return (
                                                        <div
                                                            key={label}
                                                            className={`px-3 py-2 mx-1 flex items-center justify-between rounded-lg cursor-pointer ${isSelected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}
                                                            onMouseEnter={() => setSelectedIndex(idx)}
                                                            onClick={() => autocomplete(label, typeof opt === "string" ? opt : opt.title || opt.name)}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Icon size={14} />
                                                                <span className="text-sm font-medium capitalize">{label}</span>
                                                            </div>
                                                            {isSelected && (
                                                                <div className="flex items-center gap-1 text-[10px] font-medium opacity-70">
                                                                    <span>Tab / Enter</span><CornerDownLeft size={10} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Footer */}
                                <div className="bg-muted/30 px-4 py-3 border-t border-border flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                        <span className="flex items-center gap-1.5"><Calendar size={13} /> Natural Date</span>
                                        <span className="flex items-center gap-1.5"> #category</span>``
                                        <span className="flex items-center gap-1.5"> !priority</span>
                                        <span className="flex items-center gap-1.5"> ~duration</span>
                                        <span className="flex items-center gap-1.5"> //desc</span>
                                        <span className="flex items-center gap-1.5"> -r routine</span>
                                        <span className="flex items-center gap-1.5"> -t template</span>
                                        {aiMode && <span className="flex items-center gap-1.5 text-primary"><Wand2 size={13} /> AI Active</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                                            Press Enter to save
                                        </span>
                                        <div className="bg-muted px-1.5 py-0.5 rounded border border-border text-muted-foreground shadow-sm">
                                            <CornerDownLeft size={12} strokeWidth={3} />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── AI MODE ── */}
                        {mode === "ai" && (
                            <div className="px-4 pb-4 space-y-3">
                                <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2 font-semibold text-foreground">
                                        <Wand2 size={14} className="text-primary" /> AI assistant
                                    </div>
                                    <p className="mt-1">Describe a change you want to make and I’ll turn it into actions for your tasks and calendar.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {AI_QUICK_ACTIONS.map(({ label, command }) => (
                                        <button
                                            key={command}
                                            type="button"
                                            onClick={() => {
                                                setInput(command)
                                                void runAICommand(command)
                                            }}
                                            className="rounded-full border border-border bg-muted/70 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── COMMAND MODE ── */}
                        {mode === "command" && (
                            <div>
                                <div className="mx-4 mb-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                                    <span className="text-foreground">Command mode</span>
                                    <span className="mx-2">/</span>
                                    {flatCommandItems[cmdSelectedIndex]?.label || "Search commands"}
                                </div>
                                <div ref={cmdListRef} className="max-h-[340px] overflow-y-auto pb-2">
                                    {filteredCommandItems.length === 0 && (
                                        <p className="py-8 text-center text-sm text-muted-foreground">No commands found.</p>
                                    )}
                                    {(() => {
                                        let flatIdx = -1
                                        return filteredCommandItems.map((group, gi) => (
                                            <div key={group.group}>
                                                {gi > 0 && <div className="mx-4 border-t border-border/60 my-1" />}
                                                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.group}</p>
                                                {group.items.map(item => {
                                                    flatIdx++
                                                    const idx = flatIdx
                                                    const isActive = idx === cmdSelectedIndex
                                                    return (
                                                        <button
                                                            key={item.label}
                                                            data-cmd-index={idx}
                                                            onClick={() => { handleClose(); item.action() }}
                                                            onMouseEnter={() => setCmdSelectedIndex(idx)}
                                                            className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left group ${isActive ? "bg-primary/10" : "hover:bg-muted/70"
                                                                }`}
                                                        >
                                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isActive ? "bg-primary/20" : "bg-primary/10"
                                                                }`}>
                                                                <item.icon size={13} className="text-primary" />
                                                            </div>
                                                            <span className={`text-sm font-medium flex-1 ${isActive ? "text-primary" : "text-foreground"
                                                                }`}>{item.label}</span>
                                                            {item.shortcut && (
                                                                <span className="text-[10px] font-semibold text-muted-foreground/60 tracking-widest">{item.shortcut}</span>
                                                            )}
                                                            {isActive
                                                                ? <CornerDownLeft size={13} className="text-primary/60" />
                                                                : <ArrowRight size={13} className="text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                                                            }
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        ))
                                    })()}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
