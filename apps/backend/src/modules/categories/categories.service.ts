import { db } from '../../lib/db'
import { categories, eq } from '@verve/db'

export class CategoriesService {
  static async getCategories(userId: string) {
    return db.select().from(categories).where(eq(categories.user_id, userId))
  }

  static async createCategory(userId: string, name: string, color: string) {
    const [category] = await db.insert(categories).values({
      user_id: userId,
      name,
      color
    }).returning()
    return category
  }
}
