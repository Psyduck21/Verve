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
        return { error: error.message }
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
        return { error: error.message }
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
    }

    revalidatePath("/", "layout")
    return { success: true }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/login")
}
