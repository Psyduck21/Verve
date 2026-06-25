"use client"

import dynamic from "next/dynamic"
import { TopHeader } from "@/components/layout/TopHeader"
import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton"

const CalendarView = dynamic(() => import("@/components/calendar/CalendarView"), {
    ssr: false,
    loading: () => <CalendarSkeleton />,
})

export default function CalendarPage() {
    return (
        <div className="flex flex-col h-full w-full bg-transparent" data-purpose="calendar-page">
            <div className="flex-1 bg-card rounded-tl-[32px] border-t border-border flex flex-col overflow-hidden">
                <div className="flex-1 p-8 overflow-hidden flex flex-col">
                    <CalendarView />
                </div>
            </div>
        </div>
    )
}
