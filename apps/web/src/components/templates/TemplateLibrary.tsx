"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Copy, Play, Search } from 'lucide-react'
import { TemplateModal, TemplateData } from './TemplateModal'
import { TemplateCard } from './TemplateCard'
import { apiClient } from '@/utils/apiClient'

interface Template {
  id: string
  user_id: string
  name: string
  description?: string
  default_priority: 'critical' | 'high' | 'medium' | 'low'
  default_category?: string
  default_duration_minutes: number
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
  subtasks?: Array<{
    id: string
    title: string
    order_index: number
    default_duration_minutes: number
  }>
}

export function TemplateLibrary() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await apiClient.templates.list()
      setTemplates(response.data || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const handleCreate = () => {
    setEditingTemplate(null)
    setIsModalOpen(true)
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setIsModalOpen(true)
  }

  const handleSave = async (data: TemplateData) => {
    try {
      if (editingTemplate) {
        await apiClient.templates.update(editingTemplate.id, data)
      } else {
        await apiClient.templates.create(data)
      }
      loadTemplates()
    } catch (error) {
      console.error('Failed to save template:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiClient.templates.delete(id)
      loadTemplates()
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      await apiClient.templates.duplicate(id)
      loadTemplates()
    } catch (error) {
      console.error('Failed to duplicate template:', error)
    }
  }

  const handleApply = async (id: string) => {
    try {
      await apiClient.templates.apply(id, { scheduled_at: new Date().toISOString() })
      loadTemplates()
    } catch (error) {
      console.error('Failed to apply template:', error)
    }
  }

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Template Library</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create reusable task templates for common workflows
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold transition-colors"
        >
          <Plus size={18} />
          New Template
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search templates..."
          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
        />
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? (
            <p>No templates found matching "{searchQuery}"</p>
          ) : (
            <>
              <p className="text-lg font-medium mb-2">No templates yet</p>
              <p className="text-sm">Create your first template to get started</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <TemplateCard
                template={template}
                onEdit={() => handleEdit(template)}
                onDelete={() => handleDelete(template.id)}
                onDuplicate={() => handleDuplicate(template.id)}
                onApply={() => handleApply(template.id)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <TemplateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingTemplate ? {
          name: editingTemplate.name,
          description: editingTemplate.description,
          default_priority: editingTemplate.default_priority,
          default_category: editingTemplate.default_category,
          default_duration_minutes: editingTemplate.default_duration_minutes,
          is_public: editingTemplate.is_public,
          subtasks: editingTemplate.subtasks?.map(st => ({
            title: st.title,
            default_duration_minutes: st.default_duration_minutes,
          })) || [],
        } : undefined}
      />
    </div>
  )
}
