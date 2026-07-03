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

// Extract cookie parsing logic to separate function for better testability
function parseCookieToken(cookieHeader: string): string | undefined {
  const cookiesArray = cookieHeader.split(';').map(c => c.trim())

  // Optimized: Use string.startsWith instead of regex for faster matching
  const chunkCookies = cookiesArray.filter(c =>
    c.startsWith('sb-') && c.includes('-auth-token.') && c.includes('=')
  )
  let val = ''

  if (chunkCookies.length > 0) {
    chunkCookies.sort((a, b) => {
      // Extract index from chunk (e.g., sb-xxx-auth-token.0= -> 0)
      // Keep one simple regex for index extraction (called only on small number of cookies)
      const matchA = a.match(/\.(\d+)=/)
      const matchB = b.match(/\.(\d+)=/)
      const idxA = matchA ? parseInt(matchA[1]) : 0
      const idxB = matchB ? parseInt(matchB[1]) : 0
      return idxA - idxB
    })
    val = chunkCookies.map(c => c.substring(c.indexOf('=') + 1)).join('')
  } else {
    // Optimized: Use string.includes instead of regex
    const mainCookie = cookiesArray.find(c =>
      c.startsWith('sb-') && c.includes('-auth-token=')
    )
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
        return parsed[0]
      } else if (parsed && parsed.access_token) {
        return parsed.access_token
      }
    } catch (err) {
      // Failed to parse cookie
    }
  }

  return undefined
}

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  let token: string | undefined
  const authHeader = request.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  } else if (request.headers.cookie) {
    // Use setImmediate to avoid blocking the event loop during cookie parsing
    await new Promise(resolve => setImmediate(resolve))
    token = parseCookieToken(request.headers.cookie)
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
