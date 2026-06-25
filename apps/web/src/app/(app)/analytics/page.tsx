"use client"

import dynamic from "next/dynamic"
import { ChartSkeleton } from "@/components/analytics/ChartSkeleton"

const AnalyticsView = dynamic(() => import("@/components/analytics/AnalyticsView"), {
    ssr: false,
    loading: () => <ChartSkeleton />,
})

export default function AnalyticsPage() {
    return <AnalyticsView />
}
