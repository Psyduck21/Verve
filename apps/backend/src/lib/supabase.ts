import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

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
  }
)

const jwtSecret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)

export async function verifySupabaseJWT(token: string) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      console.error('[Auth] Supabase remote verify failed:', error?.message)
      return null
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    }
  } catch (err) {
    console.error('[Auth] verify error:', err)
    return null
  }
}
