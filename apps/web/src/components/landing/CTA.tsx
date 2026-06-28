"use client"

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { TypewriterText } from '@/components/ui/TypewriterText'

export function CTA() {
  return (
    <section className="py-20 lg:py-32 bg-primary relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-8"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground">
            Ready to transform your productivity?
          </h2>

          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            <TypewriterText text="Join thousands of keyboard-first users who are getting more done in less time. Start your free trial today." delay={0.2} speed={0.02} />
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-background text-foreground hover:bg-background/90 rounded-xl font-semibold text-lg transition-all shadow-xl"
            >
              Get Started Free
              <ArrowRight size={20} />
            </Link>

            <div className="flex items-center gap-2 text-primary-foreground/80 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              No credit card required
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 pt-8">
            {[
              "14-day free trial",
              "Cancel anytime",
              "24/7 support",
              "Secure & private",
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-primary-foreground/70 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                {item}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
