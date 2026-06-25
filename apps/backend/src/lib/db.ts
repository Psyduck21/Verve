import { createDb } from '@verve/db'
import { sql } from '@verve/db'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing.')
}

export const db = createDb(connectionString)

export const withTenant = <T>(userId: string, callback: (tx: any) => Promise<T>) => {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`)
    return callback(tx)
  })
}
