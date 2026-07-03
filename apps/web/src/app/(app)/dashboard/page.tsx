import { DashboardContent } from "@/components/dashboard/DashboardContent"
import { getCurrentUser } from "@/utils/auth"

export default async function DashboardPage() {
    // P3-A: getCurrentUser() is React-cached — this call is deduplicated
    // with the one in AppLayout so there is only ONE Supabase round-trip.
    const user = await getCurrentUser()

    return <DashboardContent user={user} />
}
