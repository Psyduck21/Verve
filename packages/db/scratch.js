const postgres = require('postgres');
const sql = postgres('postgresql://postgres:Focal%40%23123%40%23@db.mrmvoxqqvwltigwsruyl.supabase.co:5432/postgres', { ssl: 'require' });

async function run() {
  try {
    await sql`ALTER TYPE "ai_request_type" ADD VALUE IF NOT EXISTS 'extract_email'`;
    await sql`ALTER TABLE "notification_schedules" DROP CONSTRAINT IF EXISTS "notification_schedules_subscription_id_web_push_subscriptions_i"`;
    await sql`ALTER TABLE "user_memory_embeddings" DROP CONSTRAINT IF EXISTS "user_memory_embeddings_use_r_id_fkey"`;
    await sql`ALTER TABLE "user_memory_embeddings" DROP CONSTRAINT IF EXISTS "user_memory_embeddings_user_id_fkey"`;
    await sql`ALTER TABLE "task_completions" ALTER COLUMN "scheduled_at" SET DATA TYPE timestamp with time zone`;
    await sql`ALTER TABLE "tombstones" ALTER COLUMN "expires_at" SET DEFAULT NOW() + INTERVAL '90 days'`;
    await sql`ALTER TABLE "tasks" ALTER COLUMN "scheduled_at" DROP DEFAULT`;
    await sql`ALTER TABLE "task_completions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL`;
    
    await sql`
      DO $$ BEGIN
        ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_subscription_id_web_push_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."web_push_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await sql`
      DO $$ BEGIN
        ALTER TABLE "user_memory_embeddings" ADD CONSTRAINT "user_memory_embeddings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("Statements executed successfully!");
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    process.exit(0);
  }
}
run();
