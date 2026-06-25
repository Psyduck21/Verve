import { Skeleton } from "@/components/ui/skeleton"

export function CalendarSkeleton() {
    return (
        <div className="flex flex-col h-full bg-background p-6 space-y-6">
            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-48 mb-2 skeleton" />
                    <Skeleton className="h-4 w-64 skeleton" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24 rounded-lg skeleton" />
                    <Skeleton className="h-10 w-32 rounded-lg skeleton" />
                </div>
            </div>

            {/* Calendar Grid Area */}
            <div className="flex-1 border border-border rounded-xl flex flex-col overflow-hidden bg-card">
                {/* Toolbar */}
                <div className="h-14 border-b border-border flex items-center justify-between px-4">
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-md skeleton" />
                        <Skeleton className="h-8 w-8 rounded-md skeleton" />
                        <Skeleton className="h-8 w-24 rounded-md skeleton" />
                    </div>
                    <Skeleton className="h-6 w-32 skeleton" />
                    <div className="flex gap-1">
                        <Skeleton className="h-8 w-16 rounded-md skeleton" />
                        <Skeleton className="h-8 w-16 rounded-md skeleton" />
                        <Skeleton className="h-8 w-16 rounded-md skeleton" />
                    </div>
                </div>
                
                {/* Grid */}
                <div className="flex-1 flex">
                    {/* Time Column */}
                    <div className="w-16 border-r border-border p-2 space-y-8">
                        {[...Array(12)].map((_, i) => (
                            <Skeleton key={i} className="h-4 w-10 skeleton" />
                        ))}
                    </div>
                    {/* Days Columns */}
                    <div className="flex-1 grid grid-cols-7 divide-x divide-border">
                        {[...Array(7)].map((_, col) => (
                            <div key={col} className="relative p-2 h-full">
                                {/* Mock Events */}
                                {col === 1 && <Skeleton className="absolute top-20 left-2 right-2 h-24 rounded-md skeleton opacity-80" />}
                                {col === 3 && <Skeleton className="absolute top-40 left-2 right-2 h-16 rounded-md skeleton opacity-80" />}
                                {col === 4 && <Skeleton className="absolute top-64 left-2 right-2 h-32 rounded-md skeleton opacity-80" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
