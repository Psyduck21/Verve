import type { FastifyPluginAsync } from 'fastify'

export const billingRoutes: FastifyPluginAsync = async (app) => {
  app.get('/subscription',    async (_, r) => r.status(501).send({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Coming in Phase 6' } }))
  app.post('/checkout',       async (_, r) => r.status(501).send({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Coming in Phase 6' } }))
  app.post('/portal',         async (_, r) => r.status(501).send({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Coming in Phase 6' } }))

  // Stripe webhook — no auth, verified by HMAC signature
  app.post('/webhook/stripe', {
    config: { rawBody: true }  // Stripe requires raw body for signature verification
  }, async (req, reply) => {
    // TODO Phase 6: verify Stripe signature + handle events (customer.subscription.*)
    app.log.info('Stripe webhook received')
    return reply.status(501).send({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Coming in Phase 6' } })
  })
}
