"use client"

import { useState } from "react"
import TaskBoard from "@/components/tasks/TaskBoard"
import { useTasks } from "@/hooks/useTasks"
import { BoardSkeleton } from "@/components/tasks/BoardSkeleton"
import { TaskListView } from "@/components/tasks/TaskListView"
import { TasksActionBar } from "@/components/tasks/TasksActionBar"
import { TasksOverviewMetrics } from "@/components/tasks/TasksOverviewMetrics"

import { useTaskStore } from "@/store/useTaskStore"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/utils/apiClient"

const PRIORITY_ORDER = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
}

export default function TasksView() {
    const { data: tasks, isLoading } = useTasks()
    
    const { data: categoriesResponse } = useQuery({
        queryKey: ['categories'],
        queryFn: apiClient.categories.getCategories,
    })
    const categories = Array.isArray(categoriesResponse) ? categoriesResponse : []

    const [view, setView] = useState("board")
    const { setIsTaskModalOpen } = useTaskStore()
    
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [sortByPriority, setSortByPriority] = useState(false)

    // Filter and sort tasks
    const filteredTasks = (tasks || []).filter((task) => {
        // Search by title
        if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false
        }
        // Filter by category
        if (selectedCategory && task.category !== selectedCategory) {
            return false
        }
        return true
    }).sort((a, b) => {
        // Sort by priority if enabled
        if (sortByPriority) {
            const priorityA = a.priority ? PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] : 0
            const priorityB = b.priority ? PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] : 0
            return priorityB - priorityA
        }
        // Otherwise maintain original order or sort by date/created_at
        return 0
    })

    return (
        <div className="flex flex-col h-full w-full bg-transparent" data-purpose="tasks-page">
            <div className="flex-1 bg-card rounded-tl-[32px] border-t border-border flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 flex flex-col">
                    <TasksActionBar 
                        view={view} 
                        onViewChange={setView} 
                        onNewTask={() => setIsTaskModalOpen(true)} 
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        categories={categories || []}
                        sortByPriority={sortByPriority}
                        setSortByPriority={setSortByPriority}
                    />
                    
                    {!isLoading && <TasksOverviewMetrics tasks={filteredTasks} />}

                    {isLoading ? (
                        <BoardSkeleton />
                    ) : (
                        <div className="flex-1 min-h-0">
                            {view === "board" && <TaskBoard initialTasks={filteredTasks} />}
                            {view === "list" && (
                                <TaskListView tasks={filteredTasks} />
                            )}
                            {view === "timeline" && (
                                <div className="flex items-center justify-center h-full text-muted-foreground font-bold border border-dashed border-border bg-card shadow-sm rounded-2xl">
                                    Timeline View coming soon
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
