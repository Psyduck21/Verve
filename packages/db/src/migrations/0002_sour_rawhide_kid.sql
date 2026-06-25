ALTER TYPE "ai_request_type" ADD VALUE 'extract_email';--> statement-breakpoint
ALTER TABLE "task_completions" RENAME COLUMN "scheduled_date" TO "scheduled_at";--> statement-breakpoint
ALTER TABLE "tasks" RENAME COLUMN "scheduled_date" TO "scheduled_at";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_completions_date";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_tasks_calendar";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_tasks_missed";--> statement-breakpoint
ALTER TABLE "task_completions" ALTER COLUMN "scheduled_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "scheduled_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task_completions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_completions_date" ON "task_completions" USING btree ("user_id","scheduled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_calendar" ON "tasks" USING btree ("user_id","scheduled_at") WHERE "tasks"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_missed" ON "tasks" USING btree ("user_id","scheduled_at","status") WHERE "tasks"."status" = 'not_started' AND "tasks"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "scheduled_time";