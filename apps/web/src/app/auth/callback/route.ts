import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { shouldRedirectToOnboarding } from '@/lib/onboarding'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      const next = searchParams.get('next')

      // Handle password reset flow
      if (next === '/update-password') {
        return NextResponse.redirect(`${origin}/update-password`)
      }

      // Create user record in backend if it doesn't exist
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/users/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: 'user.signed_up',
            type: 'auth',
            record: {
              id: data.user.id,
              email: data.user.email,
              created_at: data.user.created_at,
              email_confirmed_at: data.user.email_confirmed_at,
              user_metadata: data.user.user_metadata,
            },
          }),
        })
      } catch (err) {
        console.error('Failed to create user record:', err)
        // Continue anyway, user record might already exist
      }
      
      // Check onboarding status using centralized function
      const shouldGoToOnboarding = await shouldRedirectToOnboarding()
      const redirectPath = shouldGoToOnboarding ? '/onboarding' : '/dashboard'
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
