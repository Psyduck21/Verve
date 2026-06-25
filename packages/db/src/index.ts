import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';
export * from 'drizzle-orm';

// Provide a way to instantiate the DB connection
// We don't instantiate it directly here to avoid connecting on import,
// allowing the consuming app to provide the database URL from its environment.
export function createDb(connectionString: string) {
  const queryClient = postgres(connectionString, {
    // Connection pool configuration
    max: process.env.NODE_ENV === 'production' ? 20 : 10, // Max connections in pool
    idle_timeout: 20, // Close idle connections after 20 seconds
    connect_timeout: 10, // Connection timeout in seconds
  });
  return drizzle(queryClient, { schema });
}

export type DbClient = ReturnType<typeof createDb>;
