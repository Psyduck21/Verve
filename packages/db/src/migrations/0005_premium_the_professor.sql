ALTER TYPE "ai_request_type" ADD VALUE 'parse_task';--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "color" text DEFAULT '#3b82f6' NOT NULL;--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "icon" text;