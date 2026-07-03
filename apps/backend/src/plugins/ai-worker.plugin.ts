import fp from 'fastify-plugin'
import { startAIWorker } from '../workers/ai.worker'
import { setupQueueShutdown } from '../lib/queue'

export const aiWorkerPlugin = fp(async (app) => {
  // Start the AI worker
  const worker = startAIWorker(app)

  // Ensure graceful shutdown of the worker and queue connections
  setupQueueShutdown(app, [worker])

  app.log.info('AI Worker (BullMQ) initialized.')
})