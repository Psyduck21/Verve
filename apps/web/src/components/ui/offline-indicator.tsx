"use client"

import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Check initial state
    setIsOffline(!navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Register service worker if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .catch((err) => console.error("Service worker registration failed", err))
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-status-review text-foreground px-4 py-2 rounded-full shadow-island-lg text-sm font-semibold"
        >
          <WifiOff size={16} />
          <span>You are offline. Changes will sync when reconnected.</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
