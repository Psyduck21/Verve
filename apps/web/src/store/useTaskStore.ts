import { create } from 'zustand'

type ModalMode = 'task' | 'command'

interface TaskState {
    searchQuery: string
    setSearchQuery: (query: string) => void
    
    selectedCategory: string | null
    setSelectedCategory: (category: string | null) => void

    isDragging: boolean
    setIsDragging: (isDragging: boolean) => void

    activeTaskId: string | null
    setActiveTaskId: (id: string | null) => void

    isTaskModalOpen: boolean
    modalMode: ModalMode
    openModal: (mode: ModalMode) => void
    setIsTaskModalOpen: (isOpen: boolean) => void
}

export const useTaskStore = create<TaskState>((set) => ({
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
    
    selectedCategory: null,
    setSelectedCategory: (category) => set({ selectedCategory: category }),

    isDragging: false,
    setIsDragging: (isDragging) => set({ isDragging }),

    activeTaskId: null,
    setActiveTaskId: (id) => set({ activeTaskId: id }),

    isTaskModalOpen: false,
    modalMode: 'task',
    openModal: (mode) => set({ isTaskModalOpen: true, modalMode: mode }),
    setIsTaskModalOpen: (isOpen) => set({ isTaskModalOpen: isOpen }),
}))
