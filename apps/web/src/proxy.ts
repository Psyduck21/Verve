import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { shouldRedirectToOnboarding, shouldRedirectFromOnboarding } from "@/lib/onboarding"

export async function proxy(request: NextRequest) {
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

    const pathname = request.nextUrl.pathname

    // Protected app routes that require authentication
    const isAppRoute = pathname.startsWith('/dashboard') ||
                       pathname.startsWith('/calendar') ||
                       pathname.startsWith('/tasks') ||
                       pathname.startsWith('/analytics') ||
                       pathname.startsWith('/integrations') ||
                       pathname.startsWith('/settings') ||
                       pathname.startsWith('/profile') ||
                       pathname.startsWith('/inbox')

    // /onboarding is now in the (auth) group — requires auth but NOT the app shell
    const isOnboardingRoute = pathname.startsWith('/onboarding')

    // Pure auth routes — unauthenticated only
    const isPureAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')

    // 1. Unauthenticated → redirect to login for any protected route
    if (!user && (isAppRoute || isOnboardingRoute)) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. Authenticated → redirect away from login/signup to dashboard
    if (user && isPureAuthRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // 3. Authenticated + accessing an app route → check onboarding completion
    if (user && isAppRoute) {
        const shouldGoToOnboarding = await shouldRedirectToOnboarding()
        if (shouldGoToOnboarding) {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding'
            return NextResponse.redirect(url)
        }
    }

    // 4. Authenticated + on /onboarding → if already completed, send to dashboard
    if (user && isOnboardingRoute) {
        const shouldGoToDashboard = await shouldRedirectFromOnboarding()
        if (shouldGoToDashboard) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
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
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
