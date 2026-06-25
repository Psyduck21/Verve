import type { FastifyPluginAsync } from 'fastify'
import { google } from 'googleapis'
import { db } from '../../lib/db'
import { oauthIdentities, users, eq } from '@verve/db'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy_client_id'
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret'
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/v1/integrations/google/callback'

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
)

// Scopes required for Calendar read-only sync
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
]

export const googleRoutes: FastifyPluginAsync = async (app) => {
  // 1. Initiate OAuth flow
  app.get('/auth', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { redirect_to } = req.query as any
    
    // Generate auth URL with redirect_to in state
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // required to get a refresh token
      prompt: 'consent', // force consent to ensure we get a refresh token
      scope: SCOPES,
      state: JSON.stringify({ userId: req.user!.id, redirectTo: redirect_to || 'calendar' }),
    })
    return reply.redirect(authUrl)
  })

  // 2. OAuth Callback
  app.get('/callback', async (req, reply) => {
    const { code, state: stateStr, error } = req.query as any

    if (error) {
      app.log.error({ error }, 'Google OAuth error')
      return reply.redirect('http://localhost:3000/calendar?error=oauth_failed')
    }

    if (!code || !stateStr) {
      return reply.status(400).send({ error: 'Missing code or state' })
    }

    let state: { userId: string; redirectTo: string }
    try {
      state = JSON.parse(stateStr)
    } catch {
      // Fallback for old format (just userId string)
      state = { userId: stateStr, redirectTo: 'calendar' }
    }

    const { userId, redirectTo } = state

    try {
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code)
      oauth2Client.setCredentials(tokens)

      // Fetch user profile from Google to get provider_uid
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const userInfo = await oauth2.userinfo.get()

      if (!userInfo.data.id) {
        throw new Error('No user id returned from Google')
      }

      // Upsert into oauth_identities
      const tokenExpiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null

      const existingIdentity = await db.query.oauthIdentities.findFirst({
        where: (oi, { eq, and }) => and(
          eq(oi.user_id, userId),
          eq(oi.provider, 'google')
        )
      })

      if (existingIdentity) {
        await db.update(oauthIdentities)
          .set({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || existingIdentity.refresh_token, // Only update if new one provided
            token_expires_at: tokenExpiresAt,
            updated_at: new Date(),
            raw_profile: userInfo.data as any
          })
          .where(eq(oauthIdentities.id, existingIdentity.id))
      } else {
        await db.insert(oauthIdentities).values({
          user_id: userId,
          provider: 'google',
          provider_uid: userInfo.data.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt,
          raw_profile: userInfo.data as any
        })
      }

      // TODO: Register Webhook with Google Calendar to watch for changes
      // await registerCalendarWebhook(userId, tokens)

      // Redirect to the appropriate page based on redirectTo
      const redirectUrl = redirectTo === 'onboarding' 
        ? 'http://localhost:3000/onboarding?success=google_connected'
        : 'http://localhost:3000/calendar?success=google_connected'
      
      return reply.redirect(redirectUrl)

    } catch (err) {
      app.log.error(err, 'Failed to exchange Google OAuth token')
      const redirectUrl = redirectTo === 'onboarding'
        ? 'http://localhost:3000/onboarding?error=token_exchange_failed'
        : 'http://localhost:3000/calendar?error=token_exchange_failed'
      return reply.redirect(redirectUrl)
    }
  })

  // 3. Webhook receiver
  app.post('/webhook', async (req, reply) => {
    const channelId = req.headers['x-goog-channel-id']
    const resourceState = req.headers['x-goog-resource-state']
    const channelToken = req.headers['x-goog-channel-token'] // We can pass user_id here during registration
    
    app.log.info({ channelId, resourceState, channelToken }, 'Received Google Calendar Webhook')

    if (resourceState === 'sync') {
      // Initial sync notification, just acknowledge
      return reply.send({ success: true })
    }

    if (resourceState === 'exists') {
      // A change occurred! We should enqueue a sync job for this user.
      // For now, we'll log it. We need a background queue or immediate sync.
      app.log.info(`Change detected for user: ${channelToken}. Enqueueing sync...`)
      
      // We will implement the actual sync logic in the next step
    }

    return reply.send({ success: true })
  })
}
