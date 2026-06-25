-- Add onboarding tracking fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_step" INTEGER DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_started_at" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_skipped_steps" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "primary_focus_areas" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "priority_preference" VARCHAR(20) DEFAULT 'balanced';

-- Ensure grind_type, wake_time, sleep_time, daily_commitment_minutes are set with defaults
ALTER TABLE "users" ALTER COLUMN "grind_type" SET DEFAULT '9-to-5 Professional';
ALTER TABLE "users" ALTER COLUMN "grind_type" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "wake_time" SET DEFAULT '09:00:00'::time;
ALTER TABLE "users" ALTER COLUMN "wake_time" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "sleep_time" SET DEFAULT '22:00:00'::time;
ALTER TABLE "users" ALTER COLUMN "sleep_time" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "daily_commitment_minutes" SET DEFAULT 120;
ALTER TABLE "users" ALTER COLUMN "daily_commitment_minutes" SET NOT NULL;

-- Create onboarding_analytics table
CREATE TABLE IF NOT EXISTS "onboarding_analytics" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
    "step_number" INTEGER NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "duration_ms" INTEGER,
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for onboarding_analytics
CREATE INDEX IF NOT EXISTS "idx_onboarding_analytics_user" ON "onboarding_analytics"("user_id");
CREATE INDEX IF NOT EXISTS "idx_onboarding_analytics_step" ON "onboarding_analytics"("step_number");
CREATE INDEX IF NOT EXISTS "idx_onboarding_analytics_created_at" ON "onboarding_analytics"("created_at");

-- Add index for onboarding_step on users
CREATE INDEX IF NOT EXISTS "idx_users_onboarding_step" ON "users"("onboarding_step") WHERE "onboarding_step" > 0;
