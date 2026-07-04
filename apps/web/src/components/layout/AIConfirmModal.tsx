import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, X, Check, ArrowRight, Clock, Calendar } from "lucide-react"
import { useEffect } from "react"

export function AIConfirmModal({ open, actions, tasks, onClose, onConfirm, isSubmitting }: { open: boolean, actions: any[], tasks: any[], onClose: () => void, onConfirm: () => void, isSubmitting: boolean }) {
    // ESC key handler
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSubmitting) onClose()
        }
        if (open) {
            window.addEventListener('keydown', handleEsc)
            return () => window.removeEventListener('keydown', handleEsc)
        }
    }, [open, isSubmitting, onClose])

    if (!open) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
                onClick={(e) => {
                    if (e.target === e.currentTarget && !isSubmitting) onClose()
                }}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-lg overflow-hidden bg-card border border-border shadow-2xl rounded-3xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Sparkles className="text-primary" size={24} />
                                Confirm AI Action Plan
                            </h2>
                            <button
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[50vh] overflow-y-auto scrollbar-thin pr-2">
                            {actions.map((action, i) => {
                                const oldTask = action.task_id ? tasks.find(t => t.id === action.task_id) : null;
                                
                                return (
                                    <div key={i} className="p-4 rounded-xl border border-border bg-muted/50 space-y-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest bg-primary/20 text-primary rounded-md">
                                                {action.action}
                                            </span>
                                            <span className="font-bold text-sm">
                                                {action.new_title || oldTask?.title || action.title}
                                            </span>
                                        </div>
                                        
                                        {/* Date / Time changes */}
                                        {(oldTask?.scheduled_at || action.new_scheduled_at || action.scheduled_at) && (
                                            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground bg-card p-3 rounded-lg border border-border">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-1.5 mb-1 text-foreground/50">
                                                        <Clock size={12} /> Old
                                                    </div>
                                                    <div>
                                                        {oldTask?.scheduled_at 
                                                            ? new Date(oldTask.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                                            : 'None'}
                                                    </div>
                                                </div>
                                                <ArrowRight size={14} className="text-primary shrink-0" />
                                                <div className="flex-1 text-right">
                                                    <div className="flex items-center justify-end gap-1.5 mb-1 text-primary">
                                                        <Calendar size={12} /> New
                                                    </div>
                                                    <div className="text-foreground">
                                                        {(action.new_scheduled_at || action.scheduled_at)
                                                            ? new Date(action.new_scheduled_at || action.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                                            : 'None'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-border mt-4">
                            <button
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 py-3 text-sm font-bold bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isSubmitting}
                                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? "Executing..." : (
                                    <>
                                        <Check size={16} /> Confirm Plan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
