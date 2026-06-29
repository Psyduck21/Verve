"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updatePassword } from "../actions"
import { Icon } from "@/components/ui/Icon"
import { Loader2, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

export default function UpdatePasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)
        
        const password = formData.get("password") as string
        const confirmPassword = formData.get("confirmPassword") as string
        
        if (password !== confirmPassword) {
            setError("Passwords do not match")
            setIsLoading(false)
            return
        }
        
        const result = await updatePassword(formData)
        if (result?.error) {
            setError(result.error)
            setIsLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <div className="space-y-1">
                <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">Set new password</h2>
                <p className="text-muted-foreground font-medium text-sm">
                    Please enter your new password below.
                </p>
            </div>

            <form action={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-bold text-foreground ml-1">New Password</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••••••"
                        className="h-12 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground focus:bg-background transition-colors"
                        required
                        disabled={isLoading}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-bold text-foreground ml-1">Confirm New Password</Label>
                    <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••••••"
                        className="h-12 rounded-xl bg-muted border-border text-foreground placeholder:text-muted-foreground focus:bg-background transition-colors"
                        required
                        disabled={isLoading}
                    />
                </div>
                {error && (
                    <div className="text-sm text-destructive font-bold bg-destructive/10 p-3 rounded-xl border border-destructive/20">
                        {error}
                    </div>
                )}
                <Button
                    className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 mt-4"
                    type="submit"
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <>
                            <span>Update Password</span>
                            <Icon icon={ArrowRight} size="sm" />
                        </>
                    )}
                </Button>
            </form>
        </motion.div>
    )
}
