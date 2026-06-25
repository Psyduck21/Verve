import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { verifySupabaseJWT } from '../lib/supabase'

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      email?: string
      [key: string]: any
    }
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  let token: string | undefined
  const authHeader = request.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  } else if (request.headers.cookie) {
    const cookiesArray = request.headers.cookie.split(';').map(c => c.trim())
    
    // Find all chunks e.g. sb-mrmvoxqqvwltigwsruyl-auth-token.0, .1
    const chunkCookies = cookiesArray.filter(c => c.match(/^sb-.*-auth-token\.\d+=/))
    let val = ''

    if (chunkCookies.length > 0) {
      chunkCookies.sort((a, b) => {
        const idxA = parseInt(a.match(/\.(\d+)=/)?.[1] || '0')
        const idxB = parseInt(b.match(/\.(\d+)=/)?.[1] || '0')
        return idxA - idxB
      })
      val = chunkCookies.map(c => c.substring(c.indexOf('=') + 1)).join('')
    } else {
      const mainCookie = cookiesArray.find(c => c.match(/^sb-.*-auth-token=/))
      if (mainCookie) val = mainCookie.substring(mainCookie.indexOf('=') + 1)
    }

    if (val) {
      try {
        if (val.startsWith('base64-')) {
          val = Buffer.from(val.slice(7), 'base64').toString('utf-8')
        } else {
          val = decodeURIComponent(val)
        }
        
        const parsed = JSON.parse(val)
        if (Array.isArray(parsed)) {
          token = parsed[0]
        } else if (parsed && parsed.access_token) {
          token = parsed.access_token
        }
      } catch (err) {
        // Failed to parse cookie
      }
    }
  }

  if (!token) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Missing or invalid token' })
  }

  const user = await verifySupabaseJWT(token)

  if (!user) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
  }

  request.user = user
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', null)
  fastify.decorate('authenticate', requireAuth)
}

export default fp(authPlugin)
