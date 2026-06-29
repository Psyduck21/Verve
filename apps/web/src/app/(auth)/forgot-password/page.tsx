"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetPassword } from "../actions"
import { Icon } from "@/components/ui/Icon"
import { Loader2, ArrowRight, MailCheck, ChevronLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSuccess, setIsSuccess] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)
        const result = await resetPassword(formData)
        if (result?.error) {
            setError(result.error)
            setIsLoading(false)
        } else {
            setIsSuccess(true)
            setIsLoading(false)
        }
    }

    return (
        <AnimatePresence mode="wait">
            {!isSuccess ? (
                <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                >
                    <div className="space-y-1">
                        <Link href="/login" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-4">
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Back to login
                        </Link>
                        <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">Reset password</h2>
                        <p className="text-muted-foreground font-medium text-sm">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>
                    </div>

                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-bold text-foreground ml-1">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="alex.pro@example.com"
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
                            className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                <>
                                    <span>Send Reset Link</span>
                                    <Icon icon={ArrowRight} size="sm" />
                                </>
                            )}
                        </Button>
                    </form>
                </motion.div>
            ) : (
                <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="flex flex-col items-center justify-center text-center space-y-6 py-8"
                >
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-2 border border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.2)]">
                        <MailCheck className="w-10 h-10 text-primary" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">Check your email</h2>
                        <p className="text-muted-foreground font-medium max-w-[320px] mx-auto text-base">
                            We've sent a password reset link to your email address.
                        </p>
                    </div>
                    <div className="pt-6 w-full">
                        <Link href="/login" className="w-full h-12 flex items-center justify-center text-base font-bold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl transition-colors">
                            Back to login
                        </Link>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
