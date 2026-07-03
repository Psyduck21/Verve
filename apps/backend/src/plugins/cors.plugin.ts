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

      if (!origin) {
        return cb(null, true)
      }

      const isAllowedUrl = () => {
        try {
          const url = new URL(origin)
          return ['verve.app', 'verve-frontend.vercel.app', 'localhost'].some(domain => 
            url.hostname === domain || url.hostname.endsWith(`.${domain}`)
          ) || origin === 'https://mail.google.com'
        } catch {
          return false
        }
      }

      // Check if origin is a chrome extension. Allow if explicitly whitelisted.
      const isChromeExtension = origin.startsWith('chrome-extension://')
      const isExtensionAllowed = isChromeExtension && (
        origin === 'chrome-extension://pklbajhogpipogmepbpalmibijoeighf' ||
        allowedExtensionIds.some(id => origin.startsWith(`chrome-extension://${id}`))
      )

      if (isAllowedUrl() || isExtensionAllowed) {
        cb(null, true)
      } else {
        cb(new Error(`CORS: Origin not allowed: ${origin}`), false)
      }
    },
    credentials: true,  // Required for cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400,
  })
})
