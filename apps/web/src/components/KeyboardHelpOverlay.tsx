"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Command, CornerDownLeft } from "lucide-react"

export function KeyboardHelpOverlay() {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        const handleToggle = () => setIsOpen(prev => !prev)

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false)
            }
        }

        window.addEventListener('toggle_keyboard_help', handleToggle)
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('toggle_keyboard_help', handleToggle)
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen])

    const shortcutGroups = [
        {
            title: "Global Shortcuts",
            shortcuts: [
                { keys: ["⌘", "K"], description: "Open command palette" },
                { keys: ["/"], description: "Quick add task" },
                { keys: ["G", "D"], description: "Go to dashboard" },
                { keys: ["G", "C"], description: "Go to calendar" },
                { keys: ["G", "T"], description: "Go to tasks" },
                { keys: ["G", "L"], description: "Go to templates" },
                { keys: ["G", "I"], description: "Go to inbox" },
                { keys: ["G", "S"], description: "Go to settings" },
                { keys: ["?"], description: "Show this help" },
            ]
        },
        {
            title: "Task Navigation",
            shortcuts: [
                { keys: ["↑", "↓", "K", "J"], description: "Navigate tasks" },
                { keys: ["Shift", "↑", "↓"], description: "Extend selection" },
                { keys: ["Space"], description: "Toggle task completion" },
                { keys: ["Shift", "Space"], description: "Bulk select focused task" },
                { keys: ["Esc"], description: "Deselect tasks" },
                { keys: ["Enter", "E"], description: "Edit selected task" },
                { keys: ["1-4"], description: "Set priority" },
                { keys: ["Shift", "1-3"], description: "Move to To Do/Overdue/Doing" },
                { keys: ["U"], description: "Unschedule task" },
                { keys: ["D"], description: "Delete task" },
                { keys: [">", "<"], description: "Expand/Collapse subtasks" },
                { keys: ["S"], description: "Add subtask" },
                { keys: ["L"], description: "Lock selected task" },
            ]
        },
        {
            title: "Calendar View",
            shortcuts: [
                { keys: ["Alt", "1-3"], description: "View Day/Week/Month" },
                { keys: ["Alt", "W"], description: "Toggle right panel" },
                { keys: ["U"], description: "Unschedule selected event" },
                { keys: ["Enter"], description: "Edit selected event" },
                { keys: ["Esc"], description: "Deselect event" },
            ]
        },
        {
            title: "Time Blocking",
            shortcuts: [
                { keys: ["T", "B"], description: "Create time block" },
            ]
        },
        {
            title: "Templates",
            shortcuts: [
                { keys: ["T", "L"], description: "Open template library" },
                { keys: ["T", "A"], description: "Quick apply template" },
                { keys: ["T", "N"], description: "Create template from task" },
            ]
        },
        {
            title: "Modal Shortcuts",
            shortcuts: [
                { keys: ["↑", "↓", "Ctrl+K", "Ctrl+J"], description: "Navigate fields" },
                { keys: ["Enter"], description: "Select Option / Edit" },
                { keys: ["Esc"], description: "Close modal" },
                { keys: ["⌘", "Enter"], description: "Save changes" },
            ]
        },
        {
            title: "Task Input Syntax",
            shortcuts: [
                { keys: ["!", "priority"], description: "Set priority" },
                { keys: ["#", "category"], description: "Set category" },
                { keys: ["~", "duration"], description: "Set duration" },
                { keys: ["-r", "routine"], description: "Assign to routine" },
                { keys: ["//", "desc"], description: "Add description" },
                { keys: ["-l", "-lock"], description: "Mark task as time locked" },
            ]
        }
    ]

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[200]"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="fixed inset-0 z-[201] flex items-center justify-center p-4"
                    >
                        <div className="bg-card border border-border shadow-island-lg rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Command size={16} className="text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-foreground">Keyboard Shortcuts</h2>
                                        <p className="text-xs text-muted-foreground">Press ? to toggle</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted"
                                    aria-label="Close help"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {shortcutGroups.map((group) => (
                                        <div key={group.title}>
                                            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                                <div className="w-1 h-4 bg-primary rounded-full" />
                                                {group.title}
                                            </h3>
                                            <div className="space-y-2">
                                                {group.shortcuts.map((shortcut, idx) => (
                                                    <div
                                                        key={`${group.title}-${shortcut.description}-${idx}`}
                                                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 border border-border/50"
                                                    >
                                                        <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                                                        <div className="flex items-center gap-1">
                                                            {shortcut.keys.map((key, keyIdx) => (
                                                                <div key={keyIdx} className="flex items-center gap-1">
                                                                    <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-background border border-border rounded shadow-sm">
                                                                        {key}
                                                                    </kbd>
                                                                    {keyIdx < shortcut.keys.length - 1 && (
                                                                        <CornerDownLeft size={12} className="text-muted-foreground/50" />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border border-border rounded">Esc</kbd> to close
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border border-border rounded">?</kbd> to toggle
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
