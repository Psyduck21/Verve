"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Copy, Play, Search, Clock, Layers, Repeat, X } from 'lucide-react'
import { TemplateModal, TemplateData } from './TemplateModal'
import { TemplateCard } from './TemplateCard'
import { TimeBlockModal, TimeBlockData } from '@/components/timeblocks/TimeBlockModal'
import { apiClient } from '@/utils/apiClient'
import { toast } from '@/hooks/use-toast'
import { useRoutines, useCreateRoutine, useUpdateRoutine } from '@/hooks/useRoutines'
import { useTimeblocks, useCreateTimeblock } from '@/hooks/useTimeblocks'

interface Template {
  id: string
  user_id: string
  name: string
  description?: string
  default_priority: 'critical' | 'high' | 'medium' | 'low'
  default_category?: string
  default_duration_minutes: number
  is_public: boolean
  is_default: boolean
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

interface RoutineModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { title: string; goal: string | null }) => void
}

function RoutineModal({ isOpen, onClose, onSave }: RoutineModalProps) {
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({ title: title.trim(), goal: goal.trim() ? goal.trim() : null })
    setTitle('')
    setGoal('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-island-lg w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Create Routine</h2>
            <p className="text-sm text-muted-foreground">Add a new routine to your library.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Routine Name *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Ritual"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Goal</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Optional routine goal"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
              rows={3}
              maxLength={200}
            />
          </div>

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
              Create Routine
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function TemplateLibrary() {
  const [activeTab, setActiveTab] = useState<'templates' | 'routines' | 'timeblocks'>('templates')
  const [modalType, setModalType] = useState<'template' | 'routine' | 'timeblock' | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const { data: routines = [], isLoading: loadingRoutines } = useRoutines()
  const createRoutine = useCreateRoutine()
  const updateRoutine = useUpdateRoutine()
  const { data: timeblocks = [], isLoading: loadingTimeblocks } = useTimeblocks()
  const createTimeblock = useCreateTimeblock()

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
    setModalType(
      activeTab === 'templates'
        ? 'template'
        : activeTab === 'routines'
          ? 'routine'
          : 'timeblock'
    )
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setModalType('template')
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

  const handleSaveRoutine = async (data: { title: string; goal: string | null }) => {
    try {
      await createRoutine.mutateAsync(data)
    } catch (error) {
      console.error('Failed to create routine:', error)
    } finally {
      setModalType(null)
    }
  }

  const handleSaveTimeblock = async (data: TimeBlockData) => {
    try {
      const startTime = new Date(data.start_time)
      const endTime = new Date(data.end_time)

      await createTimeblock.mutateAsync({
        label: data.label || 'Time Block',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        task_id: data.task_id,
        color: data.color,
      })
      toast({ title: 'Time block created' })
    } catch (error: any) {
      toast({ title: 'Unable to create time block', description: error.message || 'Please try again.' })
      console.error('Failed to create timeblock:', error)
    } finally {
      setModalType(null)
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

  const handleSetTemplateDefault = async (id: string) => {
    try {
      await apiClient.templates.update(id, { is_default: true })
      loadTemplates()
    } catch (error) {
      console.error('Failed to set default template:', error)
    }
  }

  const handleSetRoutineDefault = async (id: string) => {
    try {
      await updateRoutine.mutateAsync({ id, is_default: true })
    } catch (error) {
      console.error('Failed to set default routine:', error)
    }
  }

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredRoutines = routines.filter(routine =>
    routine.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (routine.goal && routine.goal.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredTimeblocks = timeblocks.filter(block =>
    (block.label || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (block.description && block.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const tabContent = () => {
    if (activeTab === 'routines') {
      return (
        <div>
          {loadingRoutines ? (
            <div className="text-center py-12 text-muted-foreground">Loading routines...</div>
          ) : filteredRoutines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No routines found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRoutines.map((routine, index) => (
                <motion.div
                  key={routine.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-card border border-border rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        {routine.title}
                        {routine.is_default && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mt-1">
                        {routine.is_active ? 'Active routine' : 'Inactive routine'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <div className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                        {routine.task_count ?? 0} tasks
                      </div>
                      {!routine.is_default && (
                        <button
                          onClick={() => handleSetRoutineDefault(routine.id)}
                          className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  </div>
                  {routine.goal ? (
                    <p className="text-sm text-muted-foreground mb-3">{routine.goal}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">No routine goal set.</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Repeat size={14} />
                    <span>Last updated {new Date(routine.updated_at).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (activeTab === 'timeblocks') {
      return (
        <div>
          {loadingTimeblocks ? (
            <div className="text-center py-12 text-muted-foreground">Loading timeblocks...</div>
          ) : filteredTimeblocks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No timeblocks found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTimeblocks.map((block, index) => (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-card border border-border rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{block.label || 'Untitled time block'}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(block.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(block.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                      {block.color ? 'Color' : 'No color'}
                    </div>
                  </div>
                  {block.description ? (
                    <p className="text-sm text-muted-foreground mb-3">{block.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">No timeblock description.</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock size={14} />
                    <span>{block.task_id ? 'Linked to task' : 'Standalone block'}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <>
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
                  onSetDefault={() => handleSetTemplateDefault(template.id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Template Library</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create reusable task templates, review routines, or inspect active timeblocks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['templates', 'routines', 'timeblocks'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/90'}`}
            >
              {tab === 'templates' ? 'Templates' : tab === 'routines' ? 'Routines' : 'Timeblocks'}
            </button>
          ))}
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold transition-colors"
          >
            <Plus size={18} />
            {activeTab === 'templates' ? 'New Template' : activeTab === 'routines' ? 'New Routine' : 'New Timeblock'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activeTab === 'templates'
              ? 'Search templates...'
              : activeTab === 'routines'
                ? 'Search routines...'
                : 'Search timeblocks...'
          }
          className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
        />
      </div>

      {/* Active view */}
      {tabContent()}

      {/* Modals */}
      <TemplateModal
        isOpen={modalType === 'template'}
        onClose={() => setModalType(null)}
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
      <RoutineModal
        isOpen={modalType === 'routine'}
        onClose={() => setModalType(null)}
        onSave={handleSaveRoutine}
      />
      <TimeBlockModal
        isOpen={modalType === 'timeblock'}
        onClose={() => setModalType(null)}
        onSave={handleSaveTimeblock}
      />
    </div>
  )
}
