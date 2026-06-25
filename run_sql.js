const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  // We apply the vector dimension change manually to bypass Drizzle's interactive prompt
  await client.query('ALTER TABLE "user_memory_embeddings" ALTER COLUMN "embedding" TYPE vector(384);');
  
  // Also fix task_completions scheduled_date -> scheduled_at rename if needed
  try {
    await client.query('ALTER TABLE "task_completions" RENAME COLUMN "scheduled_date" TO "scheduled_at";');
    console.log("Renamed scheduled_date to scheduled_at");
  } catch (e) {
    console.log("Rename skipped or already done:", e.message);
  }
  
  console.log("SQL executed successfully.");
  await client.end();
}
run();
