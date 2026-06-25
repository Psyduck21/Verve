DO $$ BEGIN
 CREATE TYPE "public"."external_provider" AS ENUM('google_calendar', 'gmail', 'chrome_extension', 'slack', 'outlook', 'zoom');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "oauth_provider" ADD VALUE 'microsoft';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_sync_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "oauth_provider" NOT NULL,
	"sync_token" text,
	"webhook_channel_id" text,
	"webhook_expiration" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "external_provider" "external_provider";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "external_link" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "source_metadata" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_sync_state" ADD CONSTRAINT "calendar_sync_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sync_state_user_provider" ON "calendar_sync_state" USING btree ("user_id","provider");