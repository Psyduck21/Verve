import { ITaskAdapter, SyncResult } from './ITaskAdapter'
import { LinearClient } from '@linear/sdk'
import { db } from '../../../lib/db'
import { oauthIdentities, tasks, taskExternalMetadata } from '@verve/db'
import { eq, and } from '@verve/db'
import { TasksService } from '../../tasks/tasks.service'
import { FastifyBaseLogger } from 'fastify'

export class LinearAdapter implements ITaskAdapter {
  providerName = 'linear'

  constructor(private logger: FastifyBaseLogger) {}

  private async getClient(userId: string, integrationId: string): Promise<LinearClient | null> {
    const integration = await db.query.oauthIdentities.findFirst({
      where: and(
        eq(oauthIdentities.id, integrationId),
        eq(oauthIdentities.user_id, userId),
        eq(oauthIdentities.provider, 'linear' as any) // Cast since 'linear' is not in enum yet
      )
    })

    if (!integration || !integration.access_token) {
      this.logger.error({ userId, integrationId }, 'Linear integration not found or missing access token')
      return null
    }

    // In a real app, you might need to handle OAuth token refresh here
    return new LinearClient({ accessToken: integration.access_token })
  }

  async syncTasks(userId: string, integrationId: string): Promise<SyncResult> {
    const result: SyncResult = { added: 0, updated: 0, removed: 0, errors: [] }
    const client = await this.getClient(userId, integrationId)
    
    if (!client) {
      result.errors.push('Failed to initialize Linear client')
      return result
    }

    try {
      // 1. Fetch active issues assigned to the user
      const me = await client.viewer
      const myIssues = await me.assignedIssues({ filter: { state: { type: { nin: ['completed', 'canceled'] } } } })
      
      // 2. Fetch existing internal tasks linked to Linear
      const existingLinkedTasks = await db.select({
        taskId: tasks.id,
        externalId: taskExternalMetadata.external_id
      })
      .from(tasks)
      .innerJoin(taskExternalMetadata, eq(tasks.id, taskExternalMetadata.task_id))
      .where(
        and(
          eq(tasks.user_id, userId),
          eq(taskExternalMetadata.external_provider, 'linear')
        )
      )

      const existingMap = new Map(existingLinkedTasks.map(t => [t.externalId, t.taskId]))

      for (const issue of myIssues.nodes) {
        const payload = {
          title: issue.title,
          description: issue.description || '',
          status: 'not_started', // Map Linear states to internal states
          priority: issue.priority === 1 ? 'critical' : issue.priority === 2 ? 'high' : issue.priority === 3 ? 'medium' : 'low',
          external_provider: 'linear',
          external_id: issue.id,
          external_link: issue.url,
        }

        const internalTaskId = existingMap.get(issue.id)

        if (internalTaskId) {
          // Update existing task
          await TasksService.updateTask(userId, internalTaskId, payload)
          result.updated++
        } else {
          // Create new task
          await TasksService.createTask(userId, payload)
          result.added++
        }
      }
      
      return result
    } catch (error: any) {
      this.logger.error({ err: error, userId }, 'Error syncing Linear tasks')
      result.errors.push(error.message)
      return result
    }
  }

  async updateExternalStatus(userId: string, integrationId: string, externalId: string, status: string): Promise<boolean> {
    const client = await this.getClient(userId, integrationId)
    if (!client) return false

    try {
      // Map internal status to Linear state (needs proper workflow state UUID in real app)
      // For this demo, we'll assume a naive lookup or skip if not matching exactly.
      // E.g. finding the state named "Done"
      
      // const states = await client.workflowStates()
      // const targetState = states.nodes.find(s => s.name.toLowerCase() === 'done')
      // if (targetState) {
      //   await client.updateIssue(externalId, { stateId: targetState.id })
      // }
      
      this.logger.info({ externalId, status }, 'Mock updating Linear issue status')
      return true
    } catch (error) {
      this.logger.error({ err: error, externalId }, 'Error updating Linear issue status')
      return false
    }
  }
}
