"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    category: "General",
    questions: [
      {
        q: "What is Verve?",
        a: "Verve is a keyboard-first productivity tool designed for zero-click workflows. It helps you manage tasks, block time, and stay focused without relying on mouse interactions.",
      },
      {
        q: "Is Verve free to use?",
        a: "Yes! Verve offers a generous free tier with up to 100 tasks, basic time blocking, and 5 task templates. Upgrade to Pro for unlimited features.",
      },
      {
        q: "How does the keyboard-first approach work?",
        a: "Every action in Verve can be performed using keyboard shortcuts. From creating tasks to managing time blocks, you can navigate the entire app without touching your mouse.",
      },
    ],
  },
  {
    category: "Features",
    questions: [
      {
        q: "What are time blocking shortcuts?",
        a: "Time blocking shortcuts let you create and manage time blocks instantly using keyboard commands. Press T+B to create a block, use navigation keys to move, and bracket keys to resize.",
      },
      {
        q: "Can I create custom task templates?",
        a: "Absolutely! You can create templates for any recurring workflow, add subtasks, set default priorities and durations, and apply them with a single keyboard command.",
      },
      {
        q: "How do subtasks work?",
        a: "Subtasks let you break down complex tasks into smaller, manageable pieces. You can nest them, track completion progress, and reorder them using keyboard shortcuts.",
      },
    ],
  },
  {
    category: "Billing",
    questions: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards, PayPal, and for Enterprise customers, we can arrange invoice-based payments.",
      },
      {
        q: "Can I cancel my subscription anytime?",
        a: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.",
      },
      {
        q: "Do you offer refunds?",
        a: "We offer a 14-day money-back guarantee for new Pro subscriptions. If you're not satisfied, contact support for a full refund.",
      },
    ],
  },
]

export function FAQ() {
  const [openCategory, setOpenCategory] = useState(0)
  const [openQuestion, setOpenQuestion] = useState<number | null>(null)

  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about Verve
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-8">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              {/* Category Header */}
              <button
                onClick={() => setOpenCategory(categoryIndex)}
                className="flex items-center justify-between w-full text-left mb-4"
              >
                <h3 className="text-xl font-semibold text-foreground">{category.category}</h3>
                <ChevronDown
                  size={20}
                  className={`text-muted-foreground transition-transform ${
                    openCategory === categoryIndex ? 'rotate-180' : ''
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
                    className="space-y-3"
                  >
                    {category.questions.map((faq, questionIndex) => (
                      <div
                        key={questionIndex}
                        className="border border-border rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => setOpenQuestion(
                            openQuestion === questionIndex ? null : questionIndex
                          )}
                          className="flex items-center justify-between w-full p-4 text-left bg-card hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-medium text-foreground">{faq.q}</span>
                          <ChevronDown
                            size={18}
                            className={`text-muted-foreground transition-transform flex-shrink-0 ${
                              openQuestion === questionIndex ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {openQuestion === questionIndex && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="px-4 pb-4 bg-card"
                            >
                              <p className="text-muted-foreground">{faq.a}</p>
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
