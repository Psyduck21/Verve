"use client"

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Product Manager",
    company: "Stripe",
    avatar: "SC",
    content: "Verve transformed how I manage my day. The keyboard shortcuts alone save me hours every week. I can't imagine going back to mouse-heavy tools.",
    rating: 5,
  },
  {
    name: "Alex Rivera",
    role: "Senior Engineer",
    company: "Vercel",
    avatar: "AR",
    content: "Finally, a productivity tool that respects keyboard users. The time blocking feature is incredible - I schedule my entire day in minutes.",
    rating: 5,
  },
  {
    name: "Jordan Lee",
    role: "Founder & CEO",
    company: "Linear",
    avatar: "JL",
    content: "The template system is a game-changer. I've created workflows for everything from client onboarding to weekly reviews. Highly recommend!",
    rating: 5,
  },
]

const companies = [
  { name: "Stripe", logo: "Stripe" },
  { name: "Vercel", logo: "Vercel" },
  { name: "Linear", logo: "Linear" },
  { name: "Notion", logo: "Notion" },
  { name: "Figma", logo: "Figma" },
]

export function SocialProof() {
  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Company Logos */}
        <div className="mb-16">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Trusted by innovative teams worldwide
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12 opacity-60">
            {companies.map((company, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 0.6, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-xl lg:text-2xl font-bold text-foreground tracking-tight"
              >
                {company.logo}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-island-lg"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={16} className="fill-primary text-primary" />
                ))}
              </div>

              <p className="text-foreground mb-6 relative">
                <Quote className="absolute -top-2 -left-2 w-8 h-8 text-primary/20" />
                {testimonial.content}
              </p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role} at {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {[
            { value: "10,000+", label: "Active Users" },
            { value: "1M+", label: "Tasks Completed" },
            { value: "50K+", label: "Hours Saved" },
            { value: "4.9/5", label: "Average Rating" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-3xl lg:text-4xl font-bold text-primary mb-2">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
