import { createClient } from '@supabase/supabase-js'
import { jwtVerify, createRemoteJWKSet, importJWK } from 'jose'
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

// Cache for JWKS (JSON Web Key Set) to avoid repeated network calls
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null

// Get or create JWKS cache
function getJWKS() {
  if (!jwksCache) {
    // Supabase exposes JWKS at /.well-known/jwks.json
    const jwksUrl = `${process.env.SUPABASE_URL}/.well-known/jwks.json`
    jwksCache = createRemoteJWKSet(new URL(jwksUrl))
  }
  return jwksCache
}

// Optimized: Local JWT verification using Supabase's JWKS
export async function verifySupabaseJWT(token: string) {
  try {
    // Verify JWT locally using Supabase's public keys (JWKS)
    // This handles RS256/ES256 algorithms correctly with proper key types
    const { payload } = await jwtVerify(token, getJWKS(), {
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
