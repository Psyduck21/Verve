export interface SyncResult {
  added: number;
  updated: number;
  removed: number;
  errors: string[];
}

export interface ITaskAdapter {
  providerName: string;
  
  /**
   * Syncs external tasks (e.g. Linear issues) into the internal task system
   * for the given user, mapping external state to internal timeblocks.
   */
  syncTasks(userId: string, integrationId: string): Promise<SyncResult>;

  /**
   * Pushes an internal task status update back to the external provider
   */
  updateExternalStatus(userId: string, integrationId: string, externalId: string, status: string): Promise<boolean>;
}
