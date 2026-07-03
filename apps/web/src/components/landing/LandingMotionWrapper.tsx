"use client"

import { motion, type TargetAndTransition, type Transition } from "framer-motion"

interface LandingMotionWrapperProps {
    children: React.ReactNode
    className?: string
    delay?: number
    /** Custom initial state. Defaults to fade-up. */
    initial?: TargetAndTransition
    animate?: TargetAndTransition
    whileInView?: TargetAndTransition
    whileHover?: TargetAndTransition
    viewport?: { once?: boolean; margin?: string }
    transition?: Transition
}

/**
 * A thin "use client" boundary that wraps framer-motion animations.
 * Parent components can remain as Server Components by passing their
 * static content as children here.
 */
export function LandingMotionWrapper({
    children,
    className,
    delay = 0,
    initial,
    whileInView,
    whileHover,
    viewport = { once: true },
    transition,
}: LandingMotionWrapperProps) {
    const defaultInitial: TargetAndTransition = { opacity: 0, y: 20 }
    const defaultAnimate: TargetAndTransition = { opacity: 1, y: 0 }

    return (
        <motion.div
            initial={initial ?? defaultInitial}
            whileInView={whileInView ?? defaultAnimate}
            whileHover={whileHover}
            viewport={viewport}
            transition={transition ?? { duration: 0.5, delay }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

/**
 * Variant that slides in from the top (for navbars).
 */
export function LandingSlideDown({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

/**
 * Variant that wraps an AnimatePresence + toggled visibility block
 * (e.g., collapsible sections in FAQ).
 */
export { AnimatePresence } from "framer-motion"
