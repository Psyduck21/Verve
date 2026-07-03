import fp from 'fastify-plugin'
import cors from '@fastify/cors'

import { FastifyInstance } from 'fastify'

export const corsPlugin = fp(async (app: FastifyInstance) => {
  // Whitelist specific chrome extension IDs
  const allowedExtensionIds = process.env.ALLOWED_EXTENSION_IDS
    ? process.env.ALLOWED_EXTENSION_IDS.split(',')
    : []

  await app.register(cors, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      // In development or local environments, allow any origin to make it local-friendly
      if (process.env.NODE_ENV !== 'production') {
        return cb(null, true)
      }

      // Build allowed origins list for production
      const allowedOrigins = [
        'https://verve.app',
        'https://www.verve.app',
        'https://mail.google.com',
        'https://verve-ai-native.vercel.app',
      ]

      if (process.env.FRONTEND_URL) {
        allowedOrigins.push(process.env.FRONTEND_URL)
      }

      // Check if origin is a chrome extension. Allow if explicitly whitelisted.
      const isChromeExtension = origin && origin.startsWith('chrome-extension://')
      const isExtensionAllowed = isChromeExtension && (
        origin === 'chrome-extension://pklbajhogpipogmepbpalmibijoeighf' ||
        allowedExtensionIds.some(id => origin?.startsWith(`chrome-extension://${id}`))
      )

      if (!origin || allowedOrigins.includes(origin) || isExtensionAllowed) {
        cb(null, true)
      } else {
        cb(new Error(`CORS: Origin not allowed: ${origin}`), false)
      }
    },
    credentials: true,  // Required for cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-ID', 'Authorization'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400,
  })
})
