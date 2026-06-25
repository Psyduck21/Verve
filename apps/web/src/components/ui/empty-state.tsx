import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div 
            className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[300px] w-full"
        >
            <div 
                className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-[0_0_30px_hsl(var(--primary)/0.2)]"
            >
                <Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
            </div>
            
            <h3 className="text-xl font-semibold tracking-tight text-foreground mb-2">
                {title}
            </h3>
            
            <p className="text-sm text-muted-foreground max-w-[300px] mb-8 leading-relaxed">
                {description}
            </p>
            
            {action && (
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {action}
                </motion.div>
            )}
        </div>
    )
}
