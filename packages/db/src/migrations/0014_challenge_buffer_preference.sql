-- Add challenge and buffer_preference fields to users table
-- These fields allow users to specify their scheduling challenges and task spacing preferences

ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "challenge" TEXT,
ADD COLUMN IF NOT EXISTS "buffer_preference" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "users"."challenge" IS 'User''s biggest scheduling challenges (comma-separated if multiple)';
COMMENT ON COLUMN "users"."buffer_preference" IS 'User''s preference for task spacing (back_to_back, buffer_time, flexible)';
