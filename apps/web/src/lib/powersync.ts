// @ts-nocheck
import { PowerSyncDatabase, Schema, Table, column } from '@journeyapps/powersync-sdk-web'
import { createClient } from '@/utils/supabase/client'

export const AppSchema = new Schema({
  tasks: new Table({
    user_id: column.text,
    routine_id: column.text,
    title: column.text,
    priority: column.text,
    status: column.text,
    scheduled_at: column.text,
    estimated_duration_minutes: column.integer,
    actual_duration_minutes: column.integer,
    is_time_locked: column.integer,
    created_at: column.text,
    updated_at: column.text
  }),
  routines: new Table({
    user_id: column.text,
    title: column.text,
    goal: column.text,
    is_active: column.integer,
    sort_order: column.integer
  })
})

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'focal_local.sqlite'
  }
})

// Setup a connector to sync with your Postgres backend
export class SupabaseConnector {
  supabase = createClient()

  async fetchCredentials() {
    const { data: { session } } = await this.supabase.auth.getSession()
    if (!session) return null

    // Get the PowerSync token from your backend, or use the Supabase JWT directly 
    // if you have integrated Supabase Auth natively with PowerSync.
    return {
      endpoint: process.env.NEXT_PUBLIC_POWERSYNC_URL || '',
      token: session.access_token,
      expiresAt: new Date(session.expires_at! * 1000)
    }
  }

  async uploadData(database: any) {
    const tx = await database.getNextCrudTransaction()
    if (!tx) return

    for (const op of tx.crud) {
      // Forward offline writes to your Fastify API or Supabase
      // e.g. await fetch(`/api/sync`, { method: 'POST', body: JSON.stringify(op) })
    }

    await tx.complete()
  }
}

export const setupPowerSync = () => {
  const connector = new SupabaseConnector()
  db.connect(connector)
}
