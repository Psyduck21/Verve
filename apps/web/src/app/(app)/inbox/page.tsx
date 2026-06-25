import { InboxContent } from "@/components/inbox/InboxContent"
import { createClient } from "@/utils/supabase/server"

export default async function InboxPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    return <InboxContent user={user} />
}
