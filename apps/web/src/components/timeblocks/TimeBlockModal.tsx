"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, Tag } from 'lucide-react'

interface TimeBlockModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: TimeBlockData) => void
  initialData?: TimeBlockData
  linkedTask?: { id: string; title: string }
}

export interface TimeBlockData {
  start_time: string
  end_time: string
  color: string
  label?: string
  task_id?: string
}

const PRESET_COLORS = [
  '#7C3AED', // Purple
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
]

export function TimeBlockModal({ isOpen, onClose, onSave, initialData, linkedTask }: TimeBlockModalProps) {
  const [formData, setFormData] = useState<TimeBlockData>(
    initialData || {
      start_time: new Date().toISOString().slice(0, 16),
      end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
      color: '#7C3AED',
      label: '',
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
                {initialData ? 'Edit Time Block' : 'Create Time Block'}
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
              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    required
                  />
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Label
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Deep Work, Meeting"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  maxLength={100}
                />
              </div>

              {/* Linked Task */}
              {linkedTask && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Tag size={16} className="text-muted-foreground" />
                  <span className="text-sm text-foreground">{linkedTask.title}</span>
                </div>
              )}

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-all ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>

              {/* Duration Display */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={16} />
                <span>
                  Duration:{' '}
                  {(() => {
                    const start = new Date(formData.start_time)
                    const end = new Date(formData.end_time)
                    const duration = (end.getTime() - start.getTime()) / (1000 * 60)
                    const hours = Math.floor(duration / 60)
                    const minutes = duration % 60
                    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
                  })()}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-muted text-foreground hover:bg-muted/80 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold transition-colors"
                >
                  {initialData ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
