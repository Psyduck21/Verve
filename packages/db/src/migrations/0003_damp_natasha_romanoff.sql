CREATE TABLE IF NOT EXISTS "task_external_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"external_provider" "external_provider" NOT NULL,
	"external_id" text NOT NULL,
	"external_link" text,
	"source_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_recurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"recurrence_rule" text NOT NULL,
	"recurrence_parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_memory_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferences" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_external_metadata" ADD CONSTRAINT "task_external_metadata_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_external_metadata" ADD CONSTRAINT "task_external_metadata_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_recurrences" ADD CONSTRAINT "task_recurrences_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_recurrences" ADD CONSTRAINT "task_recurrences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_memory_embeddings" ADD CONSTRAINT "user_memory_embeddings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_task_external_metadata_task" ON "task_external_metadata" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_external_provider" ON "task_external_metadata" USING btree ("external_provider","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_task_recurrences_task" ON "task_recurrences" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_memory_user" ON "user_memory_embeddings" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "recurrence_rule";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "recurrence_parent_id";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "external_provider";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "external_id";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "external_link";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "source_metadata";