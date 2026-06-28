"use client"

import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import { FeatureVideo } from './FeatureVideo'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
              >
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Now in Beta
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Master Your Time with{' '}
                <span className="text-primary">Zero-Click</span> Productivity
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground max-w-xl">
                The keyboard-first productivity tool that works as fast as you think. 
                Schedule tasks, block time, and stay focused without ever touching your mouse.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl"
              >
                Get Started Free
                <ArrowRight size={20} />
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-card text-foreground hover:bg-muted border border-border rounded-xl font-semibold text-lg transition-all"
              >
                <Play size={20} className="text-primary" />
                Sign In
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-background"
                    />
                  ))}
                </div>
                <span>Trusted by 10,000+ productive teams</span>
              </div>
              <div className="hidden sm:block">•</div>
              <div className="hidden sm:block">No credit card required</div>
            </motion.div>
          </motion.div>

          {/* Right: Video */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <FeatureVideo
              title="Verve Product Demo"
              className="shadow-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
