ALTER TYPE "ai_request_type" ADD VALUE 'assistant_plan';--> statement-breakpoint
ALTER TYPE "ai_request_type" ADD VALUE 'assistant_execute';--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "scheduled_at" DROP NOT NULL;