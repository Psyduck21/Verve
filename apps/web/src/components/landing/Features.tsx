"use client"

import { motion } from 'framer-motion'
import { FeatureVideo } from './FeatureVideo'

const features = [
  {
    title: "Time Blocking Shortcuts",
    description: "Create time blocks in seconds with T+B. Navigate, resize, and manage your schedule without touching your mouse.",
    videoTitle: "Keyboard Shortcuts Demo",
    reversed: false,
  },
  {
    title: "AI-Powered Scheduling",
    description: "Let AI optimize your schedule. Smart rescheduling, conflict resolution, and intelligent task placement based on your patterns.",
    videoTitle: "AI Scheduling Demo",
    reversed: true,
  },
  {
    title: "Task Templates",
    description: "Build reusable workflows for common tasks. Apply templates instantly and maintain consistency across your projects.",
    videoTitle: "Templates Demo",
    reversed: false,
  },
  {
    title: "Subtasks & Breakdowns",
    description: "Break down complex projects into manageable subtasks. Track progress and complete work systematically.",
    videoTitle: "Subtasks Demo",
    reversed: true,
  },
]

export function Features() {
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-24">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Everything you need to stay focused
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed for keyboard-first productivity. Work faster, stay organized, achieve more.
          </p>
        </div>

        {/* Feature Items */}
        <div className="space-y-24 lg:space-y-32">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
                feature.reversed ? 'lg:grid-flow-dense' : ''
              }`}
            >
              {/* Text Content */}
              <div className={`space-y-6 ${feature.reversed ? 'lg:order-2' : ''}`}>
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-lg text-muted-foreground">
                  {feature.description}
                </p>
                <ul className="space-y-3">
                  {[
                    "Keyboard-first design",
                    "Instant actions",
                    "Zero mouse dependency",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Video */}
              <div className={feature.reversed ? 'lg:order-1' : ''}>
                <FeatureVideo
                  title={feature.videoTitle}
                  className="shadow-2xl"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
