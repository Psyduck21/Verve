ALTER TABLE "routines" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task_templates" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;