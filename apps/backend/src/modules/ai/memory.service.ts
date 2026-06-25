import { db } from '../../lib/db'
import { userMemoryEmbeddings, eq, sql } from '@verve/db'
import { pipeline, env } from '@xenova/transformers'

// Keep models cached locally in the backend to avoid re-downloading
env.cacheDir = './.cache/transformers'

// Lazy-loaded singleton pipeline
let featureExtractionPipeline: any = null

async function getPipeline() {
  if (!featureExtractionPipeline) {
    // all-MiniLM-L6-v2 outputs 384 dimensions natively
    featureExtractionPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }
  return featureExtractionPipeline
}

export class MemoryService {
  /**
   * Generates a 384-dimensional embedding for a piece of text using Xenova/transformers
   */
  static async createEmbedding(text: string): Promise<number[]> {
    const extractor = await getPipeline()
    
    // Generate embedding with mean pooling and L2 normalization
    const output = await extractor(text, { pooling: 'mean', normalize: true })
    
    // The output is a Float32Array Tensor. Convert to standard number[]
    return Array.from(output.data)
  }

  /**
   * Stores a new memory for a user
   */
  static async addMemory(userId: string, content: string, source: string = 'system') {
    const embedding = await this.createEmbedding(content)
    
    await db.insert(userMemoryEmbeddings).values({
      user_id: userId,
      content,
      embedding,
      source
    })
  }

  /**
   * Retrieves contextually relevant memories using pgvector cosine similarity
   */
  static async getRelevantMemories(userId: string, query: string, limit: number = 5): Promise<string[]> {
    const queryEmbedding = await this.createEmbedding(query)
    
    // Perform vector similarity search (cosine distance <=> 1 - cosine similarity)
    const similarity = sql<number>`1 - (${userMemoryEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)})`
    
    const results = await db.select({
      content: userMemoryEmbeddings.content,
      similarity
    })
    .from(userMemoryEmbeddings)
    .where(eq(userMemoryEmbeddings.user_id, userId))
    .orderBy(desc => sql`${userMemoryEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)}`)
    .limit(limit)

    // Filter to a certain threshold if desired
    return results.filter(r => r.similarity > 0.7).map(r => r.content)
  }
}
