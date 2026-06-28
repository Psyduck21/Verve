"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { isHotkey } from "@/utils/keyboard"
import { KEYBINDINGS } from "@/config/keybindings"
import { useTaskStore } from "@/store/useTaskStore"

export function GlobalShortcuts() {
    const router = useRouter()
    const { openModal } = useTaskStore()
    const keyBuffer = useRef<string[]>([])
    const bufferTimeout = useRef<NodeJS.Timeout | null>(null)
    const displayTimeout = useRef<NodeJS.Timeout | null>(null)
    const [activeSequence, setActiveSequence] = useState<string | null>(null)

    useEffect(() => {
        const showSequence = (label: string, duration = 1200) => {
            setActiveSequence(label)
            if (displayTimeout.current) clearTimeout(displayTimeout.current)
            displayTimeout.current = setTimeout(() => {
                setActiveSequence(null)
            }, duration)
        }

        const resetBuffer = () => {
            keyBuffer.current = []
            if (bufferTimeout.current) clearTimeout(bufferTimeout.current)
        }

        const startBuffer = (key: string, label: string) => {
            keyBuffer.current = [key]
            showSequence(label)
            if (bufferTimeout.current) clearTimeout(bufferTimeout.current)
            bufferTimeout.current = setTimeout(() => {
                keyBuffer.current = []
                setActiveSequence(null)
            }, 1000)
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input/textarea
            if (
                document.activeElement?.tagName === "INPUT" ||
                document.activeElement?.tagName === "TEXTAREA" ||
                (document.activeElement as HTMLElement)?.isContentEditable
            ) {
                return
            }

            // Ctrl+K / Cmd+K → command mode (takes priority, check first)
            if (isHotkey(e, KEYBINDINGS.GLOBAL.COMMAND_PALETTE)) {
                e.preventDefault()
                resetBuffer()
                showSequence("Command palette")
                openModal("command")
                return
            }

            // Escape clears buffer
            if (e.key === "Escape") {
                resetBuffer()
                setActiveSequence(null)
                return
            }

            const key = e.key.toLowerCase()

            if (isHotkey(e, KEYBINDINGS.GLOBAL.SHOW_HELP)) {
                e.preventDefault()
                resetBuffer()
                showSequence("Keyboard shortcuts")
                window.dispatchEvent(new CustomEvent("toggle_keyboard_help"))
                return
            }

            // ── Single-key shortcuts (checked BEFORE sequences) ──
            if (isHotkey(e, KEYBINDINGS.GLOBAL.NEW_TASK)) {
                e.preventDefault()
                resetBuffer()
                showSequence("New task")
                openModal("task")
                return
            }

            if (e.altKey && key === "a") {
                e.preventDefault()
                resetBuffer()
                showSequence("Alt+A -> AI assistant")
                openModal("ai")
                return
            }

            // ── G-prefix sequence ──
            if (keyBuffer.current[0] === "g") {
                if (bufferTimeout.current) clearTimeout(bufferTimeout.current)
                keyBuffer.current = []

                switch (key) {
                    case "d":
                        e.preventDefault()
                        showSequence("g d -> Dashboard")
                        router.push("/dashboard")
                        break
                    case "c":
                        e.preventDefault()
                        showSequence("g c -> Calendar")
                        router.push("/calendar")
                        break
                    case "t":
                        e.preventDefault()
                        showSequence("g t -> Tasks")
                        router.push("/tasks")
                        break
                    case "s":
                        e.preventDefault()
                        showSequence("g s -> Settings")
                        router.push("/settings")
                        break
                    case "i":
                        e.preventDefault()
                        showSequence("g i -> Inbox")
                        router.push("/inbox")
                        break
                    case "l":
                        e.preventDefault()
                        showSequence("g l -> Templates")
                        router.push("/templates")
                        break
                    default:
                        setActiveSequence(null)
                }
                return
            }

            // ── T-prefix sequence (templates & time blocks) ──
            if (keyBuffer.current[0] === "t") {
                if (bufferTimeout.current) clearTimeout(bufferTimeout.current)

                switch (key) {
                    case "l":
                        // Open template library
                        e.preventDefault()
                        keyBuffer.current = []
                        showSequence("t l -> Templates")
                        router.push("/templates")
                        break
                    case "a":
                        // Quick apply template — navigate to templates
                        e.preventDefault()
                        keyBuffer.current = []
                        showSequence("t a -> Templates")
                        router.push("/templates")
                        break
                    case "n":
                        // Create template from task — navigate to templates
                        e.preventDefault()
                        keyBuffer.current = []
                        showSequence("t n -> Templates")
                        router.push("/templates")
                        break
                    case "b":
                        // tb: Open time block panel
                        e.preventDefault()
                        keyBuffer.current = []
                        showSequence("t b -> Time block panel")
                        window.dispatchEvent(new CustomEvent("open_timeblock_modal"))
                        break
                    default:
                        keyBuffer.current = []
                        setActiveSequence(null)
                }
                return
            }

            // ── First key of G-prefix sequence ──
            if (key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault()
                startBuffer("g", "g -> Navigation")
                return
            }

            // ── First key of T-prefix sequence ──
            if (key === "t" && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault()
                startBuffer("t", "t -> Templates / time block")
                return
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            if (bufferTimeout.current) clearTimeout(bufferTimeout.current)
            if (displayTimeout.current) clearTimeout(displayTimeout.current)
        }
    }, [router, openModal])

    if (!activeSequence) {
        return null
    }

    return (
        <div className="fixed left-1/2 top-4 z-[250] -translate-x-1/2 rounded-full border border-border bg-card/95 px-4 py-2 text-xs font-semibold text-foreground shadow-island backdrop-blur">
            {activeSequence}
        </div>
    )
}
