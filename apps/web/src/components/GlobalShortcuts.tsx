"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { isHotkey } from "@/utils/keyboard"
import { KEYBINDINGS } from "@/config/keybindings"
import { useTaskStore } from "@/store/useTaskStore"

export function GlobalShortcuts() {
    const router = useRouter()
    const { openModal } = useTaskStore()
    const keyBuffer = useRef<string[]>([])
    const bufferTimeout = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        const resetBuffer = () => {
            keyBuffer.current = []
            if (bufferTimeout.current) clearTimeout(bufferTimeout.current)
        }

        const startBuffer = (key: string) => {
            keyBuffer.current = [key]
            if (bufferTimeout.current) clearTimeout(bufferTimeout.current)
            bufferTimeout.current = setTimeout(() => {
                keyBuffer.current = []
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
                openModal("command")
                return
            }

            // Escape clears buffer
            if (e.key === "Escape") {
                resetBuffer()
                return
            }

            const key = e.key.toLowerCase()

            // ── Single-key shortcuts (checked BEFORE sequences) ──
            if (key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault()
                resetBuffer()
                openModal("task")
                return
            }

            // ── G-prefix sequence ──
            if (keyBuffer.current[0] === "g") {
                if (bufferTimeout.current) clearTimeout(bufferTimeout.current)
                keyBuffer.current = []

                switch (key) {
                    case "d":
                        e.preventDefault()
                        router.push("/dashboard")
                        break
                    case "c":
                        e.preventDefault()
                        router.push("/calendar")
                        break
                    case "t":
                        e.preventDefault()
                        router.push("/tasks")
                        break
                    case "s":
                        e.preventDefault()
                        router.push("/settings")
                        break
                    case "i":
                        e.preventDefault()
                        router.push("/inbox")
                        break
                    case "l":
                        e.preventDefault()
                        router.push("/templates")
                        break
                }
                return
            }

            // ── T-prefix sequence (templates & time blocks) ──
            if (keyBuffer.current[0] === "t") {
                if (bufferTimeout.current) clearTimeout(bufferTimeout.current)
                keyBuffer.current = []

                switch (key) {
                    case "l":
                        // Open template library
                        e.preventDefault()
                        router.push("/templates")
                        break
                    case "a":
                        // Quick apply template — navigate to templates
                        e.preventDefault()
                        router.push("/templates")
                        break
                    case "n":
                        // Create template from task — navigate to templates
                        e.preventDefault()
                        router.push("/templates")
                        break
                    case "b":
                        // Create time block — fire event for calendar to handle
                        e.preventDefault()
                        window.dispatchEvent(new CustomEvent("open_timeblock_modal"))
                        break
                }
                return
            }

            // ── First key of G-prefix sequence ──
            if (key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault()
                startBuffer("g")
                return
            }

            // ── First key of T-prefix sequence ──
            if (key === "t" && !e.metaKey && !e.ctrlKey && !e.altKey) {
                e.preventDefault()
                startBuffer("t")
                return
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => {
            window.removeEventListener("keydown", handleKeyDown)
            if (bufferTimeout.current) clearTimeout(bufferTimeout.current)
        }
    }, [router, openModal])

    return null
}
