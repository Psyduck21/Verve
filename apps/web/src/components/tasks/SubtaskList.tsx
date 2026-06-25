"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Plus, Check } from 'lucide-react'

interface Subtask {
  id: string
  title: string
  status: 'not_started' | 'in_progress' | 'completed' | 'missed' | 'cancelled'
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimated_duration_minutes: number
  order_index: number
}

interface SubtaskListProps {
  taskId: string
  subtasks: Subtask[]
  onAddSubtask: (title: string) => void
  onToggleSubtask: (subtaskId: string) => void
  onDeleteSubtask: (subtaskId: string) => void
  onReorder: (subtaskIds: string[]) => void
}

export function SubtaskList({
  taskId,
  subtasks,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onReorder,
}: SubtaskListProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  const handleAdd = () => {
    if (newSubtaskTitle.trim()) {
      onAddSubtask(newSubtaskTitle.trim())
      setNewSubtaskTitle('')
      setIsAdding(false)
    }
  }

  const completedCount = subtasks.filter(s => s.status === 'completed').length
  const totalCount = subtasks.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="mt-2 ml-4 border-l-2 border-border pl-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span>Subtasks ({completedCount}/{totalCount})</span>
        {totalCount > 0 && (
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsAdding(true)
          }}
          className="p-1 hover:bg-muted rounded transition-colors"
          aria-label="Add subtask"
        >
          <Plus size={14} />
        </button>
      </button>

      {/* Add Subtask Input */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') setIsAdding(false)
                }}
                placeholder="Add subtask..."
                className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              >
                Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtasks */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 space-y-1"
          >
            {subtasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No subtasks</p>
            ) : (
              subtasks.map((subtask, index) => (
                <motion.div
                  key={subtask.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-2 group"
                >
                  <button
                    onClick={() => onToggleSubtask(subtask.id)}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      subtask.status === 'completed'
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border hover:border-primary'
                    }`}
                    aria-label={subtask.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {subtask.status === 'completed' && <Check size={12} />}
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      subtask.status === 'completed'
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground'
                    }`}
                  >
                    {subtask.title}
                  </span>
                  <button
                    onClick={() => onDeleteSubtask(subtask.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                    aria-label="Delete subtask"
                  >
                    <span className="text-xs text-destructive">×</span>
                  </button>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
