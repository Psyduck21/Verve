"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "../actions"
import { Icon } from "@/components/ui/Icon"
import { GoogleIcon } from "@/components/ui/GoogleIcon"
import { Loader2, ArrowRight } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { motion } from "framer-motion"

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)
        const result = await login(formData)
        if (result?.error) {
            setError(result.error)
            setIsLoading(false)
        }
    }

    async function handleGoogleSignIn() {
        setIsLoading(true)
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        if (error) {
            setError(error.message)
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
                <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">Sign in to your account</h2>
                <p className="text-muted-foreground font-medium text-sm">
                    Please enter your details to sign in to your account.
                </p>
            </div>

            <section className="space-y-4">
                <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl border-border text-foreground font-bold hover:bg-muted shadow-sm"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    type="button"
                >
                    <GoogleIcon className="w-5 h-5 mr-3" />
                    Sign in with Google
                </Button>
            </section>

            <div className="relative flex items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">or</span>
                <div className="flex-grow border-t border-border"></div>
            </div>

            <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await handleSubmit(formData);
            }} className="space-y-4">
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
                <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                        <Label htmlFor="password" className="text-sm font-bold text-foreground">Password</Label>
                        <Link href="/forgot-password" className="text-xs font-bold text-primary hover:underline decoration-2 underline-offset-4">
                            Forgot Password?
                        </Link>
                    </div>
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
                            <span>Sign In</span>
                            <Icon icon={ArrowRight} size="sm" />
                        </>
                    )}
                </Button>
            </form>

            <footer className="text-center pt-4">
                <p className="text-sm text-muted-foreground font-medium">
                    Don't have an account?{" "}
                    <Link href="/signup" className="text-primary font-bold hover:underline decoration-2 underline-offset-4 ml-1">
                        Create one for free
                    </Link>
                </p>
            </footer>
        </motion.div>
    )
}
