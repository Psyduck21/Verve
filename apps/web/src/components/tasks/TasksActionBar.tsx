"use client"

import { Search, List, LayoutGrid, SlidersHorizontal, Plus, Filter } from "lucide-react"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

interface TasksActionBarProps {
    view: string
    onViewChange: (view: string) => void
    onNewTask: () => void
    searchQuery: string
    setSearchQuery: (query: string) => void
    selectedCategory: string | null
    setSelectedCategory: (category: string | null) => void
    categories: any[]
    sortByPriority: boolean
    setSortByPriority: (sort: boolean) => void
}

export function TasksActionBar({ 
    view, 
    onViewChange, 
    onNewTask,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    categories,
    sortByPriority,
    setSortByPriority
}: TasksActionBarProps) {
    return (
        <div className="flex items-center justify-between w-full h-10 mb-6 shrink-0">
            {/* Left side: Search & Filters */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                <div className="relative flex items-center shrink-0">
                    <Icon icon={Search} size="sm" className="absolute left-3 text-muted-foreground pointer-events-none" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tasks..." 
                        className="h-10 w-64 pl-10 pr-4 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all"
                    />
                </div>
                
                <div className="flex items-center gap-2 pl-2 border-l border-border shrink-0">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={cn(
                            "h-8 px-3 text-xs font-medium rounded-full border transition-colors",
                            selectedCategory === null
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-muted-foreground border-border hover:bg-muted"
                        )}
                    >
                        All
                    </button>
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.name)}
                            className={cn(
                                "h-8 px-3 text-xs font-medium rounded-full border transition-colors whitespace-nowrap",
                                selectedCategory === category.name
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                            )}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
                
                <button 
                    onClick={() => setSortByPriority(!sortByPriority)}
                    className={cn(
                        "flex items-center gap-2 h-10 px-4 text-sm font-medium border rounded-lg transition-colors shadow-sm shrink-0 ml-2",
                        sortByPriority 
                            ? "bg-primary/10 text-primary border-primary/20" 
                            : "bg-card text-muted-foreground border-border hover:bg-muted"
                    )}
                >
                    <Icon icon={Filter} size="sm" />
                    Priority
                </button>
            </div>

            {/* Right side: View Toggle & Primary Action */}
            <div className="flex items-center gap-4">
                <div className="flex items-center p-1 bg-muted rounded-lg border border-border shadow-inner">
                    <button 
                        onClick={() => onViewChange("board")}
                        className={cn(
                            "flex items-center justify-center p-1.5 rounded-md transition-all",
                            view === "board" ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Icon icon={LayoutGrid} size="sm" />
                    </button>
                    <button 
                        onClick={() => onViewChange("list")}
                        className={cn(
                            "flex items-center justify-center p-1.5 rounded-md transition-all",
                            view === "list" ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Icon icon={List} size="sm" />
                    </button>
                </div>
            </div>
        </div>
    )
}
