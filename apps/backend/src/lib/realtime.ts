import { supabase } from './supabase'
import { FastifyBaseLogger } from 'fastify'

/**
 * Service to emit broadcast events via Supabase Realtime.
 * By using application-level broadcasts, we decouple clients from raw DB CDC streams
 * and save on Postgres connection limits.
 */
export class RealtimeService {
  constructor(private logger: FastifyBaseLogger) {}

  /**
   * Broadcast an event to a specific user's room.
   * Clients will listen to room: `user_${userId}`
   */
  async broadcastEvent(userId: string, eventName: string, payload: any) {
    const channelName = `user_${userId}`
    try {
      this.logger.debug({ channelName, eventName, payload }, 'Broadcasting realtime event')
      
      const channel = supabase.channel(channelName)
      
      const result = await channel.send({
        type: 'broadcast',
        event: eventName,
        payload: payload,
      })
      
      if (result !== 'ok') {
        this.logger.error({ channelName, eventName, result }, 'Failed to broadcast event')
      }

      // Important: Remove the channel after sending so the backend doesn't keep endless websocket connections open
      await supabase.removeChannel(channel)
      
    } catch (error) {
      this.logger.error({ err: error, channelName, eventName }, 'Error during broadcast event')
    }
  }
}

// Singleton instance for general use, though usually better injected via fastify decorators
export const realtimeService = new RealtimeService(console as any) // Fastify logger should ideally be passed in
