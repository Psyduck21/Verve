CREATE TABLE IF NOT EXISTS "onboarding_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"step_number" integer NOT NULL,
	"action" text NOT NULL,
	"duration_ms" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"default_category" text,
	"default_duration_minutes" integer DEFAULT 30 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "template_subtasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"title" text NOT NULL,
	"order_index" integer NOT NULL,
	"default_duration_minutes" integer DEFAULT 15 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "time_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"color" text DEFAULT '#7C3AED' NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "routine_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "grind_type" SET DEFAULT '9-to-5 Professional';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "grind_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "wake_time" SET DEFAULT '09:00:00'::time;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "wake_time" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "sleep_time" SET DEFAULT '22:00:00'::time;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "sleep_time" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "daily_commitment_minutes" SET DEFAULT 120;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "daily_commitment_minutes" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "parent_task_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "order_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_step" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_skipped_steps" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "primary_focus_areas" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "priority_preference" text DEFAULT 'balanced' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_analytics" ADD CONSTRAINT "onboarding_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "template_subtasks" ADD CONSTRAINT "template_subtasks_template_id_task_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_onboarding_analytics_user" ON "onboarding_analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_onboarding_analytics_step" ON "onboarding_analytics" USING btree ("step_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_onboarding_analytics_created_at" ON "onboarding_analytics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_templates_user_id" ON "task_templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_templates_public" ON "task_templates" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_template_subtasks_template_id" ON "template_subtasks" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_template_subtasks_order" ON "template_subtasks" USING btree ("template_id","order_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_time_blocks_user_id" ON "time_blocks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_time_blocks_start_time" ON "time_blocks" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_time_blocks_task_id" ON "time_blocks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_parent_task_id" ON "tasks" USING btree ("parent_task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tasks_order_index" ON "tasks" USING btree ("parent_task_id","order_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_onboarding_step" ON "users" USING btree ("onboarding_step") WHERE "users"."onboarding_step" > 0;