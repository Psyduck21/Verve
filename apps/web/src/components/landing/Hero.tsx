"use client"

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, Play, Sparkles } from 'lucide-react'
import { FeatureVideo } from './FeatureVideo'
import Link from 'next/link'
import { TypewriterText } from '@/components/ui/TypewriterText'

export function Hero() {
  const { scrollY } = useScroll()
  
  // Transform values based on global scroll position
  // Video starts hidden/scaled down, and perfectly reveals as you scroll down
  const videoScale = useTransform(scrollY, [50, 400], [0.8, 1])
  const videoOpacity = useTransform(scrollY, [50, 400], [0, 1])
  const videoY = useTransform(scrollY, [50, 400], [150, 0])

  return (
    <section className="relative overflow-hidden bg-background min-h-[150vh] flex flex-col pt-32 pb-16">
      {/* Premium Fluid Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            x: [0, 120, -80, 50, -40, 0],
            y: [0, -60, 90, -40, 110, 0],
            scale: [1, 1.15, 0.9, 1.05, 0.95, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-violet-600/30 dark:bg-violet-500/20 rounded-full blur-[120px] will-change-transform"
        />
        <motion.div
          animate={{
            x: [0, -130, 70, -90, 40, 0],
            y: [0, 110, -60, 130, -50, 0],
            scale: [1, 1.2, 0.85, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[20%] right-[-10%] w-[50%] h-[70%] bg-cyan-500/30 dark:bg-cyan-500/20 rounded-full blur-[150px] will-change-transform"
        />
        <motion.div
          animate={{
            x: [0, 90, -120, 60, -80, 0],
            y: [0, -130, 80, -90, 50, 0],
            scale: [1, 0.85, 1.15, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 32,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-[-20%] left-[20%] w-[50%] h-[60%] bg-primary/40 dark:bg-primary/30 rounded-full blur-[130px] will-change-transform"
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center h-full">
        <div className="flex flex-col items-center gap-32">
          {/* Top: Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8 relative z-10 flex flex-col items-center min-h-[70vh] justify-center"
          >
            <div className="space-y-6 flex flex-col items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold backdrop-blur-md shadow-[0_0_15px_rgba(var(--primary),0.2)]"
              >
                <Sparkles className="w-4 h-4" />
                Verve 1.0 — AI-Native
              </motion.div>

              <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-extrabold text-foreground leading-[1.05] tracking-tight max-w-4xl mx-auto flex flex-col items-center justify-center">
                <TypewriterText text="The Operating System for Your" delay={0.4} speed={0.03} />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-purple-600 animate-gradient-x mt-2">
                  <TypewriterText text="Professional Time." delay={1.4} speed={0.04} />
                </span>
              </h1>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.2, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
            >
              <Link href="/signup" passHref>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(var(--primary),0.3)] hover:shadow-[0_0_40px_rgba(var(--primary),0.5)] border border-primary/50 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  <span className="relative z-10">Get Started Free</span>
                  <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>

              <Link href="/login" passHref>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-background/50 backdrop-blur-xl text-foreground border border-border/50 shadow-lg rounded-2xl font-bold text-lg transition-all"
                >
                  <Play size={20} className="text-primary fill-primary/20" />
                  See it in Action
                </motion.button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.4 }}
              className="flex items-center justify-center gap-6 text-sm font-bold text-muted-foreground pt-4"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 border-2 border-background shadow-md flex items-center justify-center text-[10px] text-white/50"
                    >
                      ★
                    </div>
                  ))}
                </div>
                <span>Trusted by top performers</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Bottom: Video/Demo tied to Scroll */}
          <motion.div
            style={{
              scale: videoScale,
              opacity: videoOpacity,
              y: videoY,
            }}
            className="relative z-10 w-full max-w-6xl mx-auto"
          >
            {/* Decorative elements behind video */}
            {/* <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-purple-500/20 blur-2xl rounded-[3rem] opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-br from-border/40 to-transparent rounded-[2rem] -m-1" /> */}

            <FeatureVideo
              videoSrc="/demo.mp4"
              title="Verve AI-Native Demo"
              className="shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] rounded-[2rem] border border-border/50 bg-card overflow-hidden relative z-10 w-full"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
