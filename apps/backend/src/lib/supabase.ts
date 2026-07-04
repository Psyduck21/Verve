import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import { logger } from './logger'

if (!process.env.SUPABASE_URL)             throw new Error('Missing SUPABASE_URL')
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

// Admin client — bypasses RLS. NEVER expose to client.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken:  false,
      persistSession:    false,
    },
    realtime: {
      transport: WebSocket as any,
    },
  }
)

// Use Supabase's built-in JWT verification - the most reliable method
// This handles all algorithm types and key management automatically
export async function verifySupabaseJWT(token: string) {
  try {
    const { data, error } = await supabase.auth.getUser(token)
    
    if (error || !data.user) {
      logger.error('[Auth] JWT verify failed', error as Error)
      return null
    }

    return {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      app_metadata: data.user.app_metadata,
      user_metadata: data.user.user_metadata,
    }
  } catch (err: any) {
    logger.error('[Auth] JWT verify failed', err as Error)
    return null
  }
}
