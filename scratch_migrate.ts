import { sql } from 'drizzle-orm';
import { db } from './apps/backend/src/lib/db';

async function main() {
  console.log("Adding 'extract_email' and 'parse_task' to ai_request_type enum...");
  try {
    await db.execute(sql`ALTER TYPE "ai_request_type" ADD VALUE IF NOT EXISTS 'extract_email';`);
    await db.execute(sql`ALTER TYPE "ai_request_type" ADD VALUE IF NOT EXISTS 'parse_task';`);
    console.log("Success!");
  } catch (e) {
    console.error("Migration failed:", e);
  }
  process.exit(0);
}
main();
