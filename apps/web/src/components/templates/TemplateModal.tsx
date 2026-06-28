"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2 } from 'lucide-react'

interface TemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: TemplateData) => void
  initialData?: TemplateData
}

export interface TemplateData {
  name: string
  description?: string
  default_priority: 'critical' | 'high' | 'medium' | 'low'
  default_category?: string
  default_duration_minutes: number
  is_public: boolean
  subtasks: Array<{
    title: string
    default_duration_minutes: number
  }>
}

const PRESET_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const

export function TemplateModal({ isOpen, onClose, onSave, initialData }: TemplateModalProps) {
  const [formData, setFormData] = useState<TemplateData>(
    initialData || {
      name: '',
      description: '',
      default_priority: 'medium',
      default_category: '',
      default_duration_minutes: 30,
      is_public: false,
      subtasks: [],
    }
  )

  const addSubtask = () => {
    setFormData({
      ...formData,
      subtasks: [
        ...formData.subtasks,
        { title: '', default_duration_minutes: 15 },
      ],
    })
  }

  const updateSubtask = (index: number, field: string, value: string | number) => {
    const updatedSubtasks = [...formData.subtasks]
    updatedSubtasks[index] = { ...updatedSubtasks[index], [field]: value }
    setFormData({ ...formData, subtasks: updatedSubtasks })
  }

  const removeSubtask = (index: number) => {
    setFormData({
      ...formData,
      subtasks: formData.subtasks.filter((_, i) => i !== index),
    })
  }

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
        className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-2xl shadow-island-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {initialData ? 'Edit Template' : 'Create Template'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekly Review, Daily Standup"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                required
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this template for?"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Default Priority
                </label>
                <select
                  value={formData.default_priority}
                  onChange={(e) => setFormData({ ...formData, default_priority: e.target.value as any })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  {PRESET_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Default Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.default_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, default_duration_minutes: parseInt(e.target.value) || 30 })}
                  min={5}
                  max={480}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Default Category
              </label>
              <input
                type="text"
                value={formData.default_category}
                onChange={(e) => setFormData({ ...formData, default_category: e.target.value })}
                placeholder="e.g., Work, Personal"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>

            {/* Public Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="is_public" className="text-sm text-foreground">
                Make this template public (shareable with others)
              </label>
            </div>

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">
                  Subtasks
                </label>
                <button
                  type="button"
                  onClick={addSubtask}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                >
                  <Plus size={16} />
                  Add Subtask
                </button>
              </div>
              <div className="space-y-2">
                {formData.subtasks.map((subtask, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <input
                      type="text"
                      value={subtask.title}
                      onChange={(e) => updateSubtask(index, 'title', e.target.value)}
                      placeholder={`Subtask ${index + 1}`}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
                      required
                    />
                    <input
                      type="number"
                      value={subtask.default_duration_minutes}
                      onChange={(e) => updateSubtask(index, 'default_duration_minutes', parseInt(e.target.value) || 15)}
                      placeholder="15"
                      min={5}
                      max={480}
                      className="w-20 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
                    />
                <button
                  type="button"
                  onClick={() => removeSubtask(index)}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                  aria-label="Remove subtask"
                >
                  <Trash2 size={16} className="text-destructive" />
                </button>
              </div>
            ))}
                {formData.subtasks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No subtasks added. Add subtasks to create a template with multiple tasks.
                  </p>
                )}
              </div>
            </div>
          </form>

          <div className="p-6 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-muted text-foreground hover:bg-muted/80 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold transition-colors"
            >
              {initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
