import { db } from '../../lib/db'
import { categories, eq } from '@verve/db'

export class CategoriesService {
  static async getCategories(userId: string, limit = 50, offset = 0) {
    return db.select().from(categories).where(eq(categories.user_id, userId)).limit(limit).offset(offset)
  }

  static async createCategory(userId: string, name: string, color: string) {
    const [category] = await db.insert(categories).values({
      user_id: userId,
      name,
      color
    }).returning()
    return category
  }

  static async updateCategory(id: string, userId: string, updates: { name?: string; color?: string }) {
    const [category] = await db.update(categories)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(categories.id, id))
      .returning()
    return category
  }

  static async deleteCategory(id: string, userId: string) {
    await db.delete(categories).where(eq(categories.id, id))
  }
}
