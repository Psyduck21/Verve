"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { shouldRedirectToOnboarding } from "@/lib/onboarding"

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get("email") as string
    const password = formData.get("password") as string

    if (!email || !password) {
        return { error: "Email and password are required" }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        let errorMessage = error.message
        if (errorMessage.toLowerCase().includes("invalid login credentials")) {
            errorMessage = "Incorrect email or password. Please try again."
        } else if (errorMessage.toLowerCase().includes("email not confirmed")) {
            errorMessage = "Please verify your email address before logging in."
        }
        return { error: errorMessage }
    }

    revalidatePath("/", "layout")
    
    // Check onboarding status using centralized function
    const shouldGoToOnboarding = await shouldRedirectToOnboarding()
    redirect(shouldGoToOnboarding ? "/onboarding" : "/dashboard")
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const fullName = formData.get("fullName") as string

    if (!email || !password || !fullName) {
        return { error: "All fields are required" }
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
        },
    })

    if (error) {
        let errorMessage = error.message
        if (errorMessage.toLowerCase().includes("already registered")) {
            errorMessage = "An account with this email already exists. Please log in instead."
        } else if (errorMessage.toLowerCase().includes("password should be at least")) {
            errorMessage = "Your password must be at least 6 characters long."
        } else if (errorMessage.toLowerCase().includes("unable to validate email") || errorMessage.toLowerCase().includes("invalid email")) {
            errorMessage = "Please enter a valid email address."
        } else if (errorMessage.toLowerCase().includes("signups not allowed")) {
            errorMessage = "Signups are currently disabled."
        }
        return { error: errorMessage }
    }

    // Create user record in backend if session exists (auto-confirmed)
    if (data.session && data.user) {
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
                        user_metadata: data.user.user_metadata,
                    },
                }),
            })
        } catch (err) {
            console.error('Failed to create user record:', err)
        }
        
        revalidatePath("/", "layout")
        return { success: true }
    } else if (data.user) {
        // User created but no session -> Email confirmation required
        return { success: true, requiresEmailConfirmation: true }
    }

    return { error: "Failed to create account" }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/login")
}

export async function resetPassword(formData: FormData) {
    const email = formData.get("email") as string
    if (!email) {
        return { error: "Email is required" }
    }

    const supabase = await createClient()
    
    // We get the origin from headers or NEXT_PUBLIC_SITE_URL
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/update-password`,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}

export async function updatePassword(formData: FormData) {
    const password = formData.get("password") as string
    if (!password || password.length < 6) {
        return { error: "Password must be at least 6 characters" }
    }

    const supabase = await createClient()
    
    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        return { error: error.message }
    }

    redirect("/dashboard")
}
