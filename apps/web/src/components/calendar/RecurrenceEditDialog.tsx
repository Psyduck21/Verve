"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Repeat, X } from "lucide-react"

export type RecurrenceEditMode = "this" | "this_and_future" | "all"

interface RecurrenceEditDialogProps {
    open: boolean
    onClose: () => void
    onConfirm: (mode: RecurrenceEditMode) => void
    actionLabel?: string // e.g. "move" | "edit"
}

export function RecurrenceEditDialog({
    open,
    onClose,
    onConfirm,
    actionLabel = "edit",
}: RecurrenceEditDialogProps) {
    if (!open) return null

    const options: { mode: RecurrenceEditMode; label: string; description: string }[] = [
        {
            mode: "this",
            label: "This event",
            description: "Only change this one occurrence.",
        },
        {
            mode: "this_and_future",
            label: "This and following events",
            description: "Change this and all future occurrences.",
        },
        {
            mode: "all",
            label: "All events",
            description: "Change every occurrence of this repeating task.",
        },
    ]

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Repeat className="w-4 h-4 text-primary" />
                                </div>
                                <h2 className="font-semibold text-foreground text-sm capitalize">
                                    {actionLabel} recurring event
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Options */}
                        <div className="px-3 pb-4 space-y-1">
                            {options.map(({ mode, label, description }) => (
                                <button
                                    key={mode}
                                    onClick={() => {
                                        onConfirm(mode)
                                        onClose()
                                    }}
                                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted transition-colors group"
                                >
                                    <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                                        {label}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        {description}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Cancel */}
                        <div className="border-t border-border px-3 py-2">
                            <button
                                onClick={onClose}
                                className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-1.5 rounded-lg hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
