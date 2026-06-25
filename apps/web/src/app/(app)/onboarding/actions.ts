"use server"

import { createClient } from "@/utils/supabase/server"

export async function updateProfile(timezone: string, primaryFocus: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: "User not authenticated" }
    }

    const { error } = await supabase
        .from("users")
        .update({
            timezone: timezone,
            // Assuming there's a primary_focus field or similar. 
            // Add if needed: primary_focus: primaryFocus
        })
        .eq("id", user.id)

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}
