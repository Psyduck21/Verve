ALTER TABLE "routines" ADD COLUMN IF NOT EXISTS "color" text DEFAULT '#3b82f6' NOT NULL;
--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN IF NOT EXISTS "icon" text;
--> statement-breakpoint
