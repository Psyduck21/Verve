import { Skeleton } from "@/components/ui/skeleton"

export function BoardSkeleton() {
    return (
        <div className="flex flex-col h-full bg-background p-4 space-y-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, col) => (
                    <div key={col} className="flex flex-col space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-6 rounded-full" />
                        </div>
                        <div className="space-y-2">
                            {[...Array(4)].map((_, item) => (
                                <Skeleton key={item} className="h-20 w-full rounded-lg" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
