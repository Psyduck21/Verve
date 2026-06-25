import { db, taskTemplates, templateSubtasks, tasks } from '@verve/db'
import { eq, desc, and } from '@verve/db'
import { z } from 'zod'

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  default_priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  default_category: z.string().optional(),
  default_duration_minutes: z.number().min(5).max(480).optional(),
  is_public: z.boolean().optional(),
  subtasks: z.array(z.object({
    title: z.string().min(1).max(200),
    default_duration_minutes: z.number().min(5).max(480).optional(),
  })).optional(),
})

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  default_priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  default_category: z.string().optional(),
  default_duration_minutes: z.number().min(5).max(480).optional(),
  is_public: z.boolean().optional(),
  subtasks: z.array(z.object({
    title: z.string().min(1).max(200),
    default_duration_minutes: z.number().min(5).max(480).optional(),
  })).optional(),
})

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>

export class TemplatesService {
  /**
   * Create a new task template
   */
  static async createTemplate(userId: string, input: CreateTemplateInput) {
    return db.transaction(async (tx) => {
      // Create the template
      const [template] = await tx
        .insert(taskTemplates)
        .values({
          user_id: userId,
          name: input.name,
          description: input.description,
          default_priority: input.default_priority || 'medium',
          default_category: input.default_category,
          default_duration_minutes: input.default_duration_minutes || 30,
          is_public: input.is_public || false,
          usage_count: 0,
        })
        .returning()

      // Create subtasks if provided
      if (input.subtasks && input.subtasks.length > 0) {
        for (let i = 0; i < input.subtasks.length; i++) {
          await tx.insert(templateSubtasks).values({
            template_id: template.id,
            title: input.subtasks[i].title,
            order_index: i,
            default_duration_minutes: input.subtasks[i].default_duration_minutes || 15,
          })
        }
      }

      return template
    })
  }

  /**
   * List templates for a user
   */
  static async listTemplates(userId: string, options: { include_public?: boolean } = {}) {
    const conditions = [eq(taskTemplates.user_id, userId)]

    if (options.include_public) {
      conditions.push(eq(taskTemplates.is_public, true))
    }

    const templates = await db
      .select()
      .from(taskTemplates)
      .where(and(...conditions))
      .orderBy(desc(taskTemplates.usage_count), desc(taskTemplates.created_at))

    return templates
  }

  /**
   * Get a template with its subtasks
   */
  static async getTemplate(id: string, userId: string) {
    const [template] = await db
      .select()
      .from(taskTemplates)
      .where(
        and(
          eq(taskTemplates.id, id),
          eq(taskTemplates.user_id, userId)
        )
      )

    if (!template) {
      throw new Error('Template not found')
    }

    // Get subtasks
    const subtasks = await db
      .select()
      .from(templateSubtasks)
      .where(eq(templateSubtasks.template_id, id))
      .orderBy(templateSubtasks.order_index)

    return { ...template, subtasks }
  }

  /**
   * Update a template
   */
  static async updateTemplate(id: string, userId: string, input: UpdateTemplateInput) {
    return db.transaction(async (tx) => {
      const existing = await this.getTemplate(id, userId)

      // Update template
      const [updated] = await tx
        .update(taskTemplates)
        .set({
          name: input.name ?? existing.name,
          description: input.description ?? existing.description,
          default_priority: input.default_priority ?? existing.default_priority,
          default_category: input.default_category ?? existing.default_category,
          default_duration_minutes: input.default_duration_minutes ?? existing.default_duration_minutes,
          is_public: input.is_public ?? existing.is_public,
          updated_at: new Date(),
        })
        .where(eq(taskTemplates.id, id))
        .returning()

      // Update subtasks if provided
      if (input.subtasks !== undefined) {
        // Delete existing subtasks
        await tx.delete(templateSubtasks).where(eq(templateSubtasks.template_id, id))

        // Create new subtasks
        for (let i = 0; i < input.subtasks.length; i++) {
          await tx.insert(templateSubtasks).values({
            template_id: id,
            title: input.subtasks[i].title,
            order_index: i,
            default_duration_minutes: input.subtasks[i].default_duration_minutes || 15,
          })
        }
      }

      return updated
    })
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(id: string, userId: string) {
    await this.getTemplate(id, userId) // Verify ownership

    await db.delete(taskTemplates).where(eq(taskTemplates.id, id))
  }

  /**
   * Apply a template to create tasks
   */
  static async applyTemplate(id: string, userId: string, options: { scheduled_at?: string } = {}) {
    const template = await this.getTemplate(id, userId)

    // Increment usage count
    await db
      .update(taskTemplates)
      .set({ usage_count: template.usage_count + 1 })
      .where(eq(taskTemplates.id, id))

    // Create main task from template
    const scheduledAt = options.scheduled_at ? new Date(options.scheduled_at) : new Date()

    const [mainTask] = await db
      .insert(tasks)
      .values({
        user_id: userId,
        routine_id: null,
        title: template.name,
        description: template.description || `Created from template: ${template.name}`,
        priority: template.default_priority,
        status: 'not_started',
        category: template.default_category,
        scheduled_at: scheduledAt,
        estimated_duration_minutes: template.default_duration_minutes,
      })
      .returning()

    // Create subtasks if template has subtasks
    if (template.subtasks && template.subtasks.length > 0) {
      for (const subtask of template.subtasks) {
        await db.insert(tasks).values({
          user_id: userId,
          routine_id: null,
          title: subtask.title,
          description: `Subtask of: ${template.name}`,
          priority: template.default_priority,
          status: 'not_started',
          category: template.default_category,
          scheduled_at: scheduledAt,
          estimated_duration_minutes: subtask.default_duration_minutes,
        })
      }
    }

    return { template, mainTask }
  }

  /**
   * Duplicate a template
   */
  static async duplicateTemplate(id: string, userId: string) {
    const template = await this.getTemplate(id, userId)

    return this.createTemplate(userId, {
      name: `${template.name} (Copy)`,
      description: template.description,
      default_priority: template.default_priority,
      default_category: template.default_category,
      default_duration_minutes: template.default_duration_minutes,
      is_public: false, // Duplicates are never public
      subtasks: template.subtasks.map(st => ({
        title: st.title,
        default_duration_minutes: st.default_duration_minutes,
      })),
    })
  }
}
