import fp from 'fastify-plugin'
import helmet from '@fastify/helmet'

import { FastifyInstance } from 'fastify'

export const helmetPlugin = fp(async (app: FastifyInstance) => {
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc:    ["'self'"],
        scriptSrc:     ["'self'"],
        connectSrc:    ["'self'", 'https://api.verve.app', 'wss://api.verve.app'],
        imgSrc:        ["'self'", 'data:', 'https:'],
        styleSrc:      ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc:       ["'self'", 'https://fonts.gstatic.com'],
        frameAncestors: ["'none'"],
      },
    },
    hsts: {
      maxAge:            31536000,  // 1 year
      includeSubDomains: true,
      preload:           true,
    },
    frameguard:       { action: 'deny' },
    noSniff:          true,
    referrerPolicy:   { policy: 'strict-origin-when-cross-origin' },
  })
})
