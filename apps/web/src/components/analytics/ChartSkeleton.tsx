import { Skeleton } from "@/components/ui/skeleton"

export function ChartSkeleton() {
    return (
        <div className="flex flex-col h-full bg-background p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-card border border-border p-5 rounded-2xl shadow-island">
                        <Skeleton className="h-6 w-32 mb-4 skeleton" />
                        <Skeleton className="h-48 w-full rounded-xl skeleton opacity-80" />
                    </div>
                ))}
            </div>
            <div className="bg-card border border-border p-5 rounded-2xl shadow-island flex-1">
                <Skeleton className="h-6 w-48 mb-4 skeleton" />
                <Skeleton className="h-[300px] w-full rounded-xl skeleton opacity-80" />
            </div>
        </div>
    )
}
