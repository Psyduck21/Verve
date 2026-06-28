"use client"

import { motion } from 'framer-motion'
import { Calendar, Layers, Sparkles, Zap, Command, Brain } from 'lucide-react'
import { TypewriterText } from '@/components/ui/TypewriterText'

const features = [
  {
    title: "Zero Scheduling Effort",
    description: "Type naturally. Verve's AI instantly parses your intent, extracts duration and priorities, and finds the perfect slot in your calendar.",
    icon: <Sparkles className="w-6 h-6 text-primary" />,
    colSpan: "lg:col-span-2",
    delay: 0.1,
    gradient: "from-primary/20 via-primary/5 to-transparent"
  },
  {
    title: "Keyboard-First Speed",
    description: "Never touch your mouse. Create, navigate, and manage your entire day using intuitive global shortcuts and the AI Omnibox.",
    icon: <Command className="w-6 h-6 text-purple-500" />,
    colSpan: "lg:col-span-1",
    delay: 0.2,
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent"
  },
  {
    title: "Adaptive Intelligence",
    description: "Verve learns your habits, energy levels, and focus hours to build personalized routines that defend your deep work time.",
    icon: <Brain className="w-6 h-6 text-blue-500" />,
    colSpan: "lg:col-span-1",
    delay: 0.3,
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent"
  },
  {
    title: "Single Pane of Glass",
    description: "Stop context switching. Tasks, calendars, Google Sync, and AI suggestions are unified into one gorgeous, actionable dashboard.",
    icon: <Layers className="w-6 h-6 text-emerald-500" />,
    colSpan: "lg:col-span-2",
    delay: 0.4,
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent"
  }
]

export function Features() {
  return (
    <section id="features" className="py-16 lg:py-24 bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 tracking-tight">
              Intelligence at <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
                your fingertips.
              </span>
            </h2>
            <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto">
              <TypewriterText text="We replaced manual organization with adaptive AI. Experience a workflow where the system works for you, not the other way around." delay={0.3} speed={0.01} />
            </p>
          </motion.div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: feature.delay }}
              whileHover={{ scale: 1.02, translateY: -5 }}
              className={`relative overflow-hidden rounded-3xl bg-card border border-border/50 shadow-xl group ${feature.colSpan}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10 p-10 h-full flex flex-col justify-between min-h-[300px]">
                <div className="space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-background/80 backdrop-blur-xl border border-border/50 shadow-inner flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>

                {/* Decorative bottom corner pattern */}
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-border/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-tl-full" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
