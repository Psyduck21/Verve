import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'
import WebSocket from 'ws'
import { logger } from './logger'

if (!process.env.SUPABASE_URL)             throw new Error('Missing SUPABASE_URL')
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
if (!process.env.SUPABASE_JWT_SECRET)      throw new Error('Missing SUPABASE_JWT_SECRET. Required for local JWT validation.')

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

const jwtSecret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)

// Optimized: Local JWT verification instead of network call
export async function verifySupabaseJWT(token: string) {
  try {
    // Verify JWT locally - no network call (100-300ms faster)
    const { payload } = await jwtVerify(token, jwtSecret, {
      issuer: process.env.SUPABASE_URL,
      audience: 'authenticated',
    })

    return {
      id: payload.sub as string,
      email: payload.email as string,
      role: payload.role,
      app_metadata: payload.app_metadata,
      user_metadata: payload.user_metadata,
    }
  } catch (err: any) {
    logger.error('[Auth] JWT verify failed', err as Error)
    return null
  }
}
