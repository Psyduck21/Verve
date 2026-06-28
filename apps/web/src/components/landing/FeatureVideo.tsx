"use client"

import { motion } from 'framer-motion'

interface FeatureVideoProps {
  videoSrc?: string
  poster?: string
  title?: string
  className?: string
}

export function FeatureVideo({ videoSrc, poster, title, className = '' }: FeatureVideoProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Video Container with Corner Accents */}
      <div className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-island-lg">
        {/* Corner Accents - Antigravity Style */}
        <svg
          className="absolute top-0 left-0 w-12 h-12 text-primary pointer-events-none"
          viewBox="0 0 48 48"
          fill="none"
        >
          <path d="M4 4H20V6H6V20H4V4Z" fill="currentColor" opacity="0.8" />
        </svg>
        <svg
          className="absolute top-0 right-0 w-12 h-12 text-primary pointer-events-none"
          viewBox="0 0 48 48"
          fill="none"
        >
          <path d="M28 4H44V6H42V20H44V4H28Z" fill="currentColor" opacity="0.8" />
        </svg>
        <svg
          className="absolute bottom-0 left-0 w-12 h-12 text-primary pointer-events-none"
          viewBox="0 0 48 48"
          fill="none"
        >
          <path d="M4 28H6V42H20V44H4V28Z" fill="currentColor" opacity="0.8" />
        </svg>
        <svg
          className="absolute bottom-0 right-0 w-12 h-12 text-primary pointer-events-none"
          viewBox="0 0 48 48"
          fill="none"
        >
          <path d="M28 44H44V28H42V42H28V44Z" fill="currentColor" opacity="0.8" />
        </svg>

        {/* Video Player or Placeholder */}
        {videoSrc ? (
          <video
            src={videoSrc}
            poster={poster}
            className="w-full h-auto"
            controls
            title={title}
          />
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">Video coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
