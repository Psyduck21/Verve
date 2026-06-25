import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Plan-specified sizes: sm=16px, md=20px, lg=24px
const sizes = { sm: 16, md: 20, lg: 24 } as const

interface IconProps {
    icon: LucideIcon
    size?: keyof typeof sizes
    className?: string
    strokeWidth?: number
}

/**
 * Icon — thin wrapper around Lucide icons enforcing
 * Focal's standard sizes and 1.5px stroke weight.
 *
 * Usage:
 *   import { Home } from "lucide-react"
 *   <Icon icon={Home} size="md" />
 */
export function Icon({
    icon: LucideComponent,
    size = "md",
    className,
    strokeWidth = 1.5,
}: IconProps) {
    return (
        <LucideComponent
            size={sizes[size]}
            strokeWidth={strokeWidth}
            className={cn("shrink-0", className)}
        />
    )
}
