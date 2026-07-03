import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'

/**
 * Cached server-side user fetch.
 * Uses React's `cache()` to deduplicate across the RSC render tree
 * so that multiple Server Components calling getUser() in the same
 * request only trigger ONE Supabase round-trip.
 */
export const getCurrentUser = cache(async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
})
