import React from "react"
import { cn } from "@/lib/utils"

interface VerveLogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string
}

export function VerveLogo({ className, ...props }: VerveLogoProps) {
    return (
        <svg 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={cn("w-full h-full", className)}
            {...props}
        >
            <path 
                d="M20 45 L45 80 L85 20" 
                stroke="url(#verve-gradient)" 
                strokeWidth="16" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
            <defs>
                <linearGradient id="verve-gradient" x1="20" y1="20" x2="85" y2="80" gradientUnits="userSpaceOnUse">
                    {/* The stops use Tailwind current color which we can control via CSS, or we can just hardcode a color that looks good in both themes */}
                    <stop stopColor="currentColor" className="text-violet-700 dark:text-violet-400" />
                    <stop offset="1" stopColor="currentColor" className="text-pink-600 dark:text-pink-400" />
                </linearGradient>
            </defs>
        </svg>
    )
}
