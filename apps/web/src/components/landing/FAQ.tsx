"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { TypewriterText } from '@/components/ui/TypewriterText'

const faqs = [
  {
    category: "General",
    questions: [
      {
        q: "What is Verve?",
        a: "Verve is the AI-native operating system for your professional time. It unifies task management, calendar scheduling, and workflow automation into a single, intelligent surface. Instead of manually scheduling your day, you tell Verve what matters, and it handles when it happens.",
      },
      {
        q: "How does the AI scheduling work?",
        a: "When you create a task using natural language, Verve's AI instantly parses the duration, priority, and category, and finds the perfect slot in your connected calendar. If plans change or meetings run long, the AI automatically proposes a new schedule.",
      },
      {
        q: "Is Verve free to use?",
        a: "Yes! Verve offers a generous free tier that includes up to 100 AI requests per day, full calendar synchronization, and basic task templates. You can upgrade to Pro later for higher AI limits and advanced analytics.",
      },
    ],
  },
  {
    category: "Features",
    questions: [
      {
        q: "What is the Keyboard-First approach?",
        a: "Every single action in Verve can be performed using intuitive keyboard shortcuts or the AI Omnibox. From creating complex tasks to time-blocking your afternoon, you can navigate the entire application without ever touching your mouse.",
      },
      {
        q: "Does Verve sync with Google Calendar?",
        a: "Yes, Verve offers bidirectional Google Calendar sync. Your external meetings appear seamlessly alongside your tasks, and the AI actively monitors them to ensure it never double-books you.",
      },
      {
        q: "What is the 'Memory Layer'?",
        a: "Verve learns from your behavior over time. It remembers your preferred focus hours, energy levels, and routine structures (like 'Morning Focus Blocks') to make increasingly accurate scheduling suggestions.",
      },
    ],
  },
  {
    category: "Security & Privacy",
    questions: [
      {
        q: "Is my calendar data secure?",
        a: "Absolutely. All data is encrypted at rest and in transit. We only use your calendar data to facilitate scheduling within your private workspace. We do not sell your data or use it to train public AI models.",
      },
      {
        q: "Can I cancel my account?",
        a: "Yes, you can cancel your account and delete all associated data at any time from your profile settings, in full compliance with GDPR and right-to-deletion standards.",
      },
    ],
  },
]

export function FAQ() {
  const [openCategory, setOpenCategory] = useState(0)
  const [openQuestion, setOpenQuestion] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20 lg:py-32 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground font-medium">
            <TypewriterText text="Everything you need to know about the future of productivity." delay={0.2} speed={0.02} />
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-8">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              {/* Category Header */}
              <button
                onClick={() => setOpenCategory(categoryIndex)}
                className="flex items-center justify-between w-full text-left mb-4 group"
              >
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{category.category}</h3>
                <ChevronDown
                  size={20}
                  className={`text-muted-foreground transition-transform duration-300 ${
                    openCategory === categoryIndex ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </button>

              {/* Questions */}
              <AnimatePresence>
                {openCategory === categoryIndex && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {category.questions.map((faq, questionIndex) => (
                      <div
                        key={questionIndex}
                        className="border border-border/50 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <button
                          onClick={() => setOpenQuestion(
                            openQuestion === questionIndex ? null : questionIndex
                          )}
                          className="flex items-center justify-between w-full p-5 text-left bg-card hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-semibold text-foreground pr-8">{faq.q}</span>
                          <ChevronDown
                            size={18}
                            className={`text-muted-foreground transition-transform duration-300 flex-shrink-0 ${
                              openQuestion === questionIndex ? 'rotate-180 text-primary' : ''
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {openQuestion === questionIndex && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="bg-card"
                            >
                              <div className="px-5 pb-5 pt-1">
                                <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
