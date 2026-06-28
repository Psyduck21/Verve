import { useState, useEffect } from "react"
import { isHotkey } from "@/utils/keyboard"
import { KEYBINDINGS } from "@/config/keybindings"

interface UseListNavigationOptions {
    itemCount: number
    disabled?: boolean
    onSelect?: (index: number) => void
    onUnschedule?: (index: number) => void
    onDelete?: (index: number) => void
    initialIndex?: number
}

export function useListNavigation({
    itemCount,
    disabled = false,
    onSelect,
    onUnschedule,
    onDelete,
    initialIndex = -1,
}: UseListNavigationOptions) {
    const [focusedIndex, setFocusedIndex] = useState(initialIndex)

    useEffect(() => {
        if (itemCount === 0 && focusedIndex !== -1) {
            setFocusedIndex(-1)
        } else if (focusedIndex >= itemCount && itemCount > 0) {
            setFocusedIndex(itemCount - 1)
        }
    }, [itemCount, focusedIndex])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (disabled) return
            if (itemCount === 0) return

            if (isHotkey(e, KEYBINDINGS.TASK_BOARD.NAV_DOWN)) {
                e.preventDefault()
                setFocusedIndex((prev) => (prev < itemCount - 1 ? prev + 1 : prev))
            } else if (isHotkey(e, KEYBINDINGS.TASK_BOARD.NAV_UP)) {
                e.preventDefault()
                setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev))
            } else if (isHotkey(e, KEYBINDINGS.TASK_BOARD.EDIT_TASK) && focusedIndex >= 0) {
                e.preventDefault()
                onSelect?.(focusedIndex)
            } else if (isHotkey(e, KEYBINDINGS.TASK_BOARD.UNSCHEDULE) && focusedIndex >= 0) {
                // 'u' mapped via config now
                e.preventDefault()
                onUnschedule?.(focusedIndex)
            } else if (isHotkey(e, KEYBINDINGS.TASK_BOARD.DELETE_TASK) && focusedIndex >= 0) {
                e.preventDefault()
                onDelete?.(focusedIndex)
            } else if (isHotkey(e, KEYBINDINGS.TASK_BOARD.DESELECT)) {
                setFocusedIndex(-1)
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [itemCount, disabled, focusedIndex, onSelect, onUnschedule, onDelete])

    return { focusedIndex, setFocusedIndex }
}
