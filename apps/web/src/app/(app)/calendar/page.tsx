"use client"

import dynamic from "next/dynamic"
import { CalendarSkeleton } from "@/components/calendar/CalendarSkeleton"

// P2-B: CalendarView manages its own date state internally.
// The page is now a Client Component to allow lazy loading of the heavy
// react-big-calendar bundle only when the user navigates here.
const CalendarView = dynamic(() => import("@/components/calendar/CalendarView"), {
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
