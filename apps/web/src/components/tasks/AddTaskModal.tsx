"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { apiClient } from "@/utils/apiClient"
import { Sparkles, Calendar, Tag, AlertCircle, CornerDownLeft, ArrowUp, ArrowDown, Clock, AlignLeft } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { KEYBINDINGS } from "@/config/keybindings"
import { isHotkey } from "@/utils/keyboard"

import { useCreateTask } from "@/hooks/useTasks"


interface AddTaskModalProps {
    open: boolean
    onClose: () => void
}

const PRIORITIES = ["critical", "high", "medium", "low"]
const DURATIONS = ["15m", "30m", "45m", "1h", "1.5h", "2h", "3h", "4h", "8h"]

interface ParsedTask {
    priority: string | null;
    category: string | null;
    duration: number | null;
    durationStr: string | null;
    description: string | null;
    cleanTitle: string;
}

const parseInput = (text: string): ParsedTask => {
    let cleanTitle = text;
    let priority = null;
    let category = null;
    let duration = null;
    let durationStr = null;
    let description = null;

    // Extract description
    const descMatch = cleanTitle.match(/\/\/(.*)$/);
    if (descMatch) {
        description = descMatch[1].trim();
        cleanTitle = cleanTitle.replace(/\/\/(.*)$/, '').trim();
    }

    // Extract tags
    const words = cleanTitle.split(' ');
    const remainingWords = [];
    
    for (const word of words) {
        if (word.startsWith('!') && word.length > 1) {
            priority = word.substring(1).toLowerCase();
        } else if (word.startsWith('#') && word.length > 1) {
            category = word.substring(1).toLowerCase();
        } else if (word.startsWith('~') && word.length > 1) {
            const d = word.substring(1).toLowerCase();
            durationStr = d;
            if (d.endsWith('m')) duration = parseInt(d);
            else if (d.endsWith('h')) duration = parseFloat(d) * 60;
        } else {
            remainingWords.push(word);
        }
    }
    
    return {
        priority,
        category,
        duration,
        durationStr,
        description,
        cleanTitle: remainingWords.join(' ').trim()
    }
}

export function AddTaskModal({ open, onClose }: AddTaskModalProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [input, setInput] = useState("")

    // Popup state
    const [popupType, setPopupType] = useState<'priority' | 'category' | 'duration' | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const createTaskMutation = useCreateTask()

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: apiClient.categories.getCategories,
        enabled: open
    })

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50)
            setPopupType(null)
            setSearchQuery("")
            setSelectedIndex(0)
        }
    }, [open])

    useEffect(() => {
        const handleGlobalEvent = () => { }
        window.addEventListener('open_add_task', handleGlobalEvent)
        return () => window.removeEventListener('open_add_task', handleGlobalEvent)
    }, [])

    const defaultCategories = [
        {name: 'work', color: '#ef4444'},
        {name: 'personal', color: '#3b82f6'},
        {name: 'health', color: '#10b981'}
    ]
    const displayCategories = categories.length > 0 ? categories : defaultCategories

    const filteredOptions = popupType === 'priority'
        ? PRIORITIES.filter(p => p.includes(searchQuery))
        : popupType === 'category'
            ? displayCategories.filter((c: any) => c.name.toLowerCase().includes(searchQuery))
            : popupType === 'duration'
                ? DURATIONS.filter(d => d.includes(searchQuery))
                : []

    // Always ensure selected index is valid when filtered options change
    useEffect(() => {
        if (filteredOptions.length > 0 && selectedIndex >= filteredOptions.length) {
            setSelectedIndex(filteredOptions.length - 1)
        }
    }, [filteredOptions.length, selectedIndex])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setInput(val)
        
        const pos = e.target.selectionStart || val.length
        const textBeforeCursor = val.slice(0, pos)
        const match = textBeforeCursor.match(/(?:^|\s)(!|#|~)(\w*)$/)
        
        if (match) {
            const trigger = match[1];
            setPopupType(trigger === '!' ? 'priority' : trigger === '#' ? 'category' : 'duration')
            setSearchQuery(match[2].toLowerCase())
            if (searchQuery !== match[2].toLowerCase()) {
                setSelectedIndex(0)
            }
        } else {
            setPopupType(null)
        }
    }

    const autocomplete = (optionText: string) => {
        const pos = inputRef.current?.selectionStart || input.length
        const textBeforeCursor = input.slice(0, pos)
        const textAfterCursor = input.slice(pos)
        
        const match = textBeforeCursor.match(/(?:^|\s)(!|#|~)(\w*)$/)
        if (match) {
            const replaceStart = pos - match[1].length - match[2].length
            const prefix = textBeforeCursor.slice(0, replaceStart)
            const spacer = prefix.length > 0 && !prefix.endsWith(' ') ? ' ' : ''
            const newTextBefore = prefix + spacer + match[1] + optionText + ' '
            
            setInput(newTextBefore + textAfterCursor)
            setPopupType(null)
            
            // Re-focus and set cursor position
            setTimeout(() => {
                inputRef.current?.focus()
                inputRef.current?.setSelectionRange(newTextBefore.length, newTextBefore.length)
            }, 10)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (popupType) {
            if (isHotkey(e, KEYBINDINGS.MODALS.CLOSE)) {
                e.preventDefault()
                setPopupType(null)
                return
            }
            if (isHotkey(e, KEYBINDINGS.MODALS.NAV_DOWN)) {
                e.preventDefault()
                setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredOptions.length))
                return
            }
            if (isHotkey(e, KEYBINDINGS.MODALS.NAV_UP)) {
                e.preventDefault()
                setSelectedIndex(prev => (prev - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length))
                return
            }
            if (isHotkey(e, KEYBINDINGS.MODALS.SELECT_OPTION)) {
                e.preventDefault()
                if (filteredOptions.length > 0) {
                    const opt = filteredOptions[selectedIndex]
                    autocomplete(popupType === 'priority' || popupType === 'duration' ? opt : opt.name)
                }
                return
            }
        }

        if (isHotkey(e, KEYBINDINGS.MODALS.SELECT_AND_SAVE_OPTION) && input.trim()) {
            e.preventDefault()
            handleSave()
        }
        if (isHotkey(e, KEYBINDINGS.MODALS.CLOSE)) {
            handleClose()
        }
    }

    const handleSave = async () => {
        if (!input.trim() || isSubmitting) return
        setIsSubmitting(true)
        
        const parsed = parseInput(input);
        
        try {
            const localTimeString = new Date().toString()
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            
            // Send the clean title to AI to extract natural language date/time
            const aiRes = await apiClient.ai.parseTask(parsed.cleanTitle, localTimeString, timezone)
            if (!aiRes.success || !aiRes.data) {
                throw new Error("Failed to parse task via AI")
            }

            const aiParsed = aiRes.data
            createTaskMutation.mutate({
                title: parsed.cleanTitle || aiParsed.title || "Untitled Task",
                priority: (parsed.priority as any) || aiParsed.priority || "medium",
                category: parsed.category || aiParsed.category || "personal",
                status: "not_started",
                scheduled_at: aiParsed.scheduled_at || new Date().toISOString(),
                estimated_duration_minutes: parsed.duration || 30,
                description: parsed.description || undefined
            }, { 
                onSuccess: handleClose,
                onError: (err) => {
                    setIsSubmitting(false)
                    alert("Failed to save task: " + err.message)
                }
            })
        } catch (error: any) {
            console.log("AI parsing failed:", error)
            // Fallback
            createTaskMutation.mutate({
                title: parsed.cleanTitle || input,
                priority: (parsed.priority as any) || "medium",
                category: parsed.category || "personal",
                status: "not_started",
                scheduled_at: new Date().toISOString(),
                estimated_duration_minutes: parsed.duration || 30,
                description: parsed.description || undefined
            }, { 
                onSuccess: handleClose,
                onError: (err) => {
                    setIsSubmitting(false)
                    alert("Failed to save task in fallback: " + err.message)
                }
            })
        }
    }

    const handleClose = () => {
        setInput("")
        setPopupType(null)
        setIsSubmitting(false)
        onClose()
    }

    if (!open) return null

    const liveParsed = parseInput(input);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 bg-background/40 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="relative w-full max-w-2xl mx-4 bg-card border border-border shadow-island-lg rounded-2xl overflow-visible"
                    >
                        <div className="p-4 pb-2 flex items-center gap-3">
                            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                <Sparkles size={14} className="text-primary" />
                            </div>
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="E.g., Review designs tomorrow at 10am (use ! # ~ //)"
                                className="w-full bg-transparent border-none outline-none text-foreground text-lg placeholder:text-muted-foreground/60"
                                disabled={createTaskMutation.isPending}
                            />
                        </div>
                        
                        {/* Live Parsing Preview Bar */}
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
                            {(!liveParsed.priority && !liveParsed.category && !liveParsed.duration && !liveParsed.description && input.length > 0) && (
                                <span className="text-[10px] text-muted-foreground opacity-60 italic">AI will parse time...</span>
                            )}
                        </div>

                        {/* Dropdown Popover for Inline Commands */}
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
                                        <div className="flex gap-1.5 items-center">
                                            <span className="flex items-center"><ArrowUp size={10} /><ArrowDown size={10} /></span>
                                        </div>
                                    </div>
                                    <div className="py-1">
                                        {filteredOptions.map((opt: any, idx: number) => {
                                            const isSelected = idx === selectedIndex
                                            const label = typeof opt === 'string' ? opt : opt.name
                                            const Icon = popupType === 'priority' ? AlertCircle : popupType === 'duration' ? Clock : Tag
                                            
                                            return (
                                                <div
                                                    key={label}
                                                    className={`px-3 py-2 mx-1 flex items-center justify-between rounded-lg cursor-pointer ${isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                                                    onMouseEnter={() => setSelectedIndex(idx)}
                                                    onClick={() => autocomplete(label)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Icon size={14} />
                                                        <span className="text-sm font-medium capitalize">{label}</span>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="flex items-center gap-1 text-[10px] font-medium opacity-70">
                                                            <span>Tab / Enter</span>
                                                            <CornerDownLeft size={10} />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="bg-muted/30 px-4 py-3 border-t border-border flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                <span className="flex items-center gap-1.5"><Calendar size={13} /> Natural Date</span>
                                <span className="flex items-center gap-1.5"><Tag size={13} /> #category</span>
                                <span className="flex items-center gap-1.5"><AlertCircle size={13} /> !priority</span>
                                <span className="flex items-center gap-1.5"><Clock size={13} /> ~duration</span>
                                <span className="flex items-center gap-1.5"><AlignLeft size={13} /> //desc</span>
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
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
