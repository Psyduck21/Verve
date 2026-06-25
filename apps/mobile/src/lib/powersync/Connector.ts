import { AbstractPowerSyncDatabase, PowerSyncBackendConnector, UpdateType } from '@powersync/react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/v1';

export class AppBackendConnector implements PowerSyncBackendConnector {
  
  /**
   * Fetch credentials from the Fastify backend
   */
  async fetchCredentials() {
    // In a real app, retrieve the current Supabase session token
    const sessionToken = "current_supabase_jwt"; 
    
    try {
      const response = await fetch(`${BACKEND_URL}/sync/powersync-token`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PowerSync token: ${response.status}`);
      }

      const data = await response.json();

      return {
        endpoint: process.env.EXPO_PUBLIC_POWERSYNC_URL || 'https://foo.powersync.journeyapps.com',
        token: data.token,
      };
    } catch (e) {
      console.error("Error fetching PowerSync credentials", e);
      throw e;
    }
  }

  /**
   * Upload mutations to the Fastify backend
   */
  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    try {
      for (const operation of transaction.crud) {
        const { op: opType, table, id, opData } = operation;
        
        let endpoint = `${BACKEND_URL}/${table}`;
        let method = 'POST';
        let body = opData;

        switch (opType) {
          case UpdateType.PUT:
            method = 'POST'; // Assuming our backend uses POST /tasks for insert
            break;
          case UpdateType.PATCH:
            method = 'PUT'; // Assuming PUT /tasks/:id for update
            endpoint = `${endpoint}/${id}`;
            break;
          case UpdateType.DELETE:
            method = 'DELETE';
            endpoint = `${endpoint}/${id}`;
            body = undefined;
            break;
        }

        const sessionToken = "current_supabase_jwt"; 

        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${table} ${opType}: ${response.statusText}`);
        }
      }

      // Mark the transaction as complete
      await transaction.complete();
    } catch (error) {
      console.error('Data upload error:', error);
      // Let PowerSync know it failed, so it can retry later
      throw error;
    }
  }
}
