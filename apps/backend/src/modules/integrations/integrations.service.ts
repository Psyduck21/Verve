import { FastifyBaseLogger } from 'fastify'
import { ITaskAdapter } from './adapters/ITaskAdapter'
import { LinearAdapter } from './adapters/LinearAdapter'

export class IntegrationsService {
  private adapters: Map<string, ITaskAdapter> = new Map()

  constructor(private logger: FastifyBaseLogger) {
    this.registerAdapter(new LinearAdapter(logger))
  }

  private registerAdapter(adapter: ITaskAdapter) {
    this.adapters.set(adapter.providerName, adapter)
  }

  async syncProvider(userId: string, integrationId: string, provider: string) {
    const adapter = this.adapters.get(provider)
    if (!adapter) {
      throw new Error(`Integration provider '${provider}' not supported or not registered`)
    }

    this.logger.info({ userId, integrationId, provider }, 'Starting external sync')
    const result = await adapter.syncTasks(userId, integrationId)
    this.logger.info({ userId, integrationId, provider, result }, 'External sync complete')
    
    return result
  }
}
