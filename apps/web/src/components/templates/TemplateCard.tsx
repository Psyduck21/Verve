"use client"

import { motion } from 'framer-motion'
import { Copy, Play, Edit, Trash2, Clock, Layers } from 'lucide-react'

interface Template {
  id: string
  name: string
  description?: string
  default_priority: 'critical' | 'high' | 'medium' | 'low'
  default_category?: string
  default_duration_minutes: number
  is_public: boolean
  is_default: boolean
  usage_count: number
  subtasks?: Array<{
    id: string
    title: string
    order_index: number
    default_duration_minutes: number
  }>
}

interface TemplateCardProps {
  template: Template
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onApply: () => void
  onSetDefault: () => void
}

const PRIORITY_COLORS = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

export function TemplateCard({ template, onEdit, onDelete, onDuplicate, onApply, onSetDefault }: TemplateCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
          {template.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {template.is_default && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded">
              Default
            </span>
          )}
          <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[template.default_priority]}`} />
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <Clock size={14} />
          <span>{template.default_duration_minutes}m</span>
        </div>
        {template.subtasks && template.subtasks.length > 0 && (
          <div className="flex items-center gap-1">
            <Layers size={14} />
            <span>{template.subtasks.length} subtasks</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span>Used {template.usage_count}x</span>
        </div>
      </div>

      {template.subtasks && template.subtasks.length > 0 && (
        <div className="mb-3 space-y-1">
          {template.subtasks.slice(0, 3).map((subtask) => (
            <div key={subtask.id} className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="w-1 h-1 bg-muted-foreground rounded-full" />
              <span className="truncate">{subtask.title}</span>
            </div>
          ))}
          {template.subtasks.length > 3 && (
            <div className="text-xs text-muted-foreground">
              +{template.subtasks.length - 3} more
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <button
          onClick={onApply}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors"
        >
          <Play size={14} />
          Apply
        </button>
        {!template.is_default && (
          <button
            onClick={onSetDefault}
            className="flex-1 px-2 py-1.5 bg-muted text-foreground hover:bg-muted/80 rounded-lg text-[10px] font-bold uppercase transition-colors"
          >
            Set Default
          </button>
        )}
        <button
          onClick={onDuplicate}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          aria-label="Duplicate template"
        >
          <Copy size={16} className="text-foreground" />
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          aria-label="Edit template"
        >
          <Edit size={16} className="text-foreground" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
          aria-label="Delete template"
        >
          <Trash2 size={16} className="text-destructive" />
        </button>
      </div>
    </motion.div>
  )
}
