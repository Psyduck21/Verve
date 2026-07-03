import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { inArray } from 'drizzle-orm';

export * from './schema';
export * from 'drizzle-orm';
export { inArray };

// Provide a way to instantiate the DB connection
// We don't instantiate it directly here to avoid connecting on import,
// allowing the consuming app to provide the database URL from its environment.
export function createDb(connectionString: string) {
  const queryClient = postgres(connectionString, {
    // Connection pool configuration optimized for 512MB RAM environment
    max: process.env.NODE_ENV === 'production' ? 10 : 5, // Conservative max connections for low memory
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
    max_lifetime: 60 * 30, // Recreate connections after 30 minutes
    prepare: true, // Enable prepared statements for better performance
    connection: {
      application_name: 'verve-backend',
    },
  });
  return drizzle(queryClient, { schema });
}

export type DbClient = ReturnType<typeof createDb>;
