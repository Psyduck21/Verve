"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Edit, Trash2, Plus } from 'lucide-react'
import { TimeBlockModal, TimeBlockData } from './TimeBlockModal'
import { apiClient } from '@/utils/apiClient'

interface TimeBlock {
  id: string
  user_id: string
  task_id?: string
  start_time: string
  end_time: string
  color: string
  label?: string
  created_at: string
  updated_at: string
}

interface TimeBlockViewProps {
  date: Date
  timeBlocks: TimeBlock[]
  onRefresh: () => void
}

export function TimeBlockView({ date, timeBlocks, onRefresh }: TimeBlockViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null)

  const handleCreate = () => {
    setEditingBlock(null)
    setIsModalOpen(true)
  }

  const handleEdit = (block: TimeBlock) => {
    setEditingBlock(block)
    setIsModalOpen(true)
  }

  const handleSave = async (data: TimeBlockData) => {
    try {
      if (editingBlock) {
        await apiClient.timeblocks.update(editingBlock.id, data)
      } else {
        await apiClient.timeblocks.create(data)
      }
      onRefresh()
    } catch (error) {
      console.error('Failed to save time block:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiClient.timeblocks.delete(id)
      onRefresh()
    } catch (error) {
      console.error('Failed to delete time block:', error)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const getDuration = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  // Sort time blocks by start time
  const sortedBlocks = [...timeBlocks].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Time Blocks
        </h3>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Block
        </button>
      </div>

      {/* Time Blocks List */}
      {sortedBlocks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock size={48} className="mx-auto mb-3 opacity-50" />
          <p>No time blocks for this day</p>
          <p className="text-sm mt-1">Create a time block to schedule focused work</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedBlocks.map((block, index) => (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
              style={{
                backgroundColor: `${block.color}10`,
                borderLeft: `4px solid ${block.color}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {block.label && (
                    <h4 className="font-semibold text-foreground mb-1">{block.label}</h4>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>
                        {formatTime(block.start_time)} - {formatTime(block.end_time)}
                      </span>
                    </div>
                    <span>•</span>
                    <span>{getDuration(block.start_time, block.end_time)}</span>
                  </div>
                  {block.task_id && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Linked to task
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(block)}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                    aria-label="Edit time block"
                  >
                    <Edit size={16} className="text-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(block.id)}
                    className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
                    aria-label="Delete time block"
                  >
                    <Trash2 size={16} className="text-destructive" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <TimeBlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingBlock ? {
          start_time: editingBlock.start_time,
          end_time: editingBlock.end_time,
          color: editingBlock.color,
          label: editingBlock.label,
          task_id: editingBlock.task_id,
        } : undefined}
      />
    </div>
  )
}
