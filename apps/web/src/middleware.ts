import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isAppRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
                       request.nextUrl.pathname.startsWith('/calendar') ||
                       request.nextUrl.pathname.startsWith('/tasks') ||
                       request.nextUrl.pathname.startsWith('/analytics') ||
                       request.nextUrl.pathname.startsWith('/integrations') ||
                       request.nextUrl.pathname.startsWith('/settings') ||
                       request.nextUrl.pathname.startsWith('/profile') ||
                       request.nextUrl.pathname.startsWith('/inbox')

    const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding')

    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                        request.nextUrl.pathname.startsWith('/signup')

    // If unauthenticated and trying to access an app route, redirect to login
    if (!user && (isAppRoute || isOnboardingRoute)) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If authenticated and trying to access auth routes, redirect to dashboard
    if (user && isAuthRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
    }

    // Check onboarding status for authenticated users
    if (user && isAppRoute) {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/onboarding/status`, {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                })
                
                if (response.ok) {
                    const data = await response.json()
                    if (!data.data.completed) {
                        const url = request.nextUrl.clone()
                        url.pathname = '/onboarding'
                        return NextResponse.redirect(url)
                    }
                }
            }
        } catch (error) {
            // If onboarding check fails, allow user to proceed
            console.error('Onboarding check failed:', error)
        }
    }

    // If authenticated and onboarding is completed, redirect to dashboard
    if (user && isOnboardingRoute) {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/onboarding/status`, {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                })
                
                if (response.ok) {
                    const data = await response.json()
                    if (data.data.completed) {
                        const url = request.nextUrl.clone()
                        url.pathname = '/dashboard'
                        return NextResponse.redirect(url)
                    }
                }
            }
        } catch (error) {
            // If onboarding check fails, allow user to stay on onboarding
            console.error('Onboarding check failed:', error)
        }
    }

    // If root route, redirect depending on auth status
    if (request.nextUrl.pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = user ? '/dashboard' : '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
