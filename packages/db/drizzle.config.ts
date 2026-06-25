import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema:    './src/schema/index.ts',
  out:       './src/migrations',
  dialect:   'postgresql',
  dbCredentials: {
    url: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.LOCAL_DATABASE_URL ?? '',
  },
  verbose: true,
  strict:  true,
})
