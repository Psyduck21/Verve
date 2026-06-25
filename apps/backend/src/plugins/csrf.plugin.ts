import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import csrf from '@fastify/csrf-protection'

const csrfPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(csrf, {
    cookieOpts: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  })
}

export default fp(csrfPlugin)
