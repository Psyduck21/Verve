import { describe, expect, test, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import authPlugin from './auth.plugin'

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(async (token) => {
        if (token === 'valid-token') {
          return { data: { user: { id: 'user-1' } }, error: null }
        }
        return { data: { user: null }, error: new Error('Invalid token') }
      })
    }
  }))
}))

describe('Auth Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('authenticate middleware rejects missing token', async () => {
    const app = Fastify()
    await app.register(authPlugin)
    
    app.get('/test', { preHandler: [app.authenticate] }, async (req, reply) => {
      return { ok: true }
    })

    const response = await app.inject({
      method: 'GET',
      url: '/test'
    })

    expect(response.statusCode).toBe(401)
  })

  test('authenticate middleware accepts valid token', async () => {
    const app = Fastify()
    await app.register(authPlugin)
    
    app.get('/test', { preHandler: [app.authenticate] }, async (req, reply) => {
      return { ok: true, user: req.user }
    })

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: {
        authorization: 'Bearer valid-token'
      }
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.payload)).toMatchObject({ ok: true, user: { id: 'user-1' } })
  })
})
