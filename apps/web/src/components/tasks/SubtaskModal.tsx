"use client"

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { KEYBINDINGS } from '@/config/keybindings'
import { isHotkey } from '@/utils/keyboard'

type SubtaskPriority = 'critical' | 'high' | 'medium' | 'low'

interface SubtaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (title: string, options?: { priority?: SubtaskPriority; duration?: number }) => void
  initialTitle?: string
  initialPriority?: SubtaskPriority
  initialDuration?: number
}

export function SubtaskModal({
  isOpen,
  onClose,
  onSave,
  initialTitle = '',
  initialPriority = 'medium',
  initialDuration = 15,
}: SubtaskModalProps) {
  const [title, setTitle] = useState(initialTitle)
  const [priority, setPriority] = useState(initialPriority)
  const [duration, setDuration] = useState(initialDuration)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle)
      setPriority(initialPriority)
      setDuration(initialDuration)
      setTimeout(() => titleInputRef.current?.focus(), 50)
    }
  }, [isOpen, initialTitle, initialPriority, initialDuration])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isHotkey(e, KEYBINDINGS.MODALS.CLOSE)) {
        e.preventDefault()
        onClose()
      } else if (isHotkey(e, KEYBINDINGS.MODALS.SAVE)) {
        e.preventDefault()
        if (title.trim()) {
          onSave(title.trim(), { priority, duration })
          setTitle('')
          setPriority('medium')
          setDuration(15)
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, title, priority, duration, onClose, onSave])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      onSave(title.trim(), { priority, duration })
      setTitle('')
      setPriority('medium')
      setDuration(15)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-2xl shadow-island-lg w-full max-w-md"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                Add Subtask
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Subtask Title *
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Research competitors"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  required
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as SubtaskPriority)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 15)}
                    min={5}
                    max={480}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-muted text-foreground hover:bg-muted/80 rounded-lg font-semibold transition-colors"
                >
                  Cancel <span className="text-xs text-muted-foreground/60 ml-1">(Esc)</span>
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold transition-colors"
                >
                  Add Subtask <span className="text-xs text-primary-foreground/60 ml-1">(⌘/Ctrl+Enter)</span>
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
