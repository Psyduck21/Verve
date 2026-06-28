import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('[Auth] signOut error:', error.message)
  } catch (err) {
    console.error('[Auth] signOut exception:', err)
  }

  return NextResponse.redirect(`${origin}/login`)
}

export async function POST(request: Request) {
  // Support POST as well for programmatic sign-out
  return GET(request)
}
