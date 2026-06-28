"use client"

import { motion } from 'framer-motion'
import { useRef, useEffect } from 'react'

interface FeatureVideoProps {
  videoSrc?: string
  poster?: string
  title?: string
  className?: string
}

export function FeatureVideo({ videoSrc, poster, title, className = '' }: FeatureVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && videoSrc && !videoSrc.endsWith('.webp') && !videoSrc.endsWith('.gif')) {
      // Ensure video plays and loop starts smoothly
      videoRef.current.play().catch(e => console.log('Autoplay prevented:', e))
    }
  }, [videoSrc])

  return (
    <div className={`relative ${className}`}>
      {/* Video Player or Placeholder */}
      {videoSrc ? (
        videoSrc.endsWith('.webp') || videoSrc.endsWith('.gif') ? (
          <img
            src={videoSrc}
            alt={title || "Feature demonstration"}
            className="w-full h-auto"
          />
        ) : (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={poster}
            className="w-full h-auto"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            controls={false}
            title={title}
          />
        )
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
  )
}
