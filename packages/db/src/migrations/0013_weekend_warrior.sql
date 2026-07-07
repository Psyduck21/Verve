-- Add weekend_warrior field to users table
-- This field allows users to specify if they want to work on weekends

ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "weekend_warrior" BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN "users"."weekend_warrior" IS 'Whether the user prefers to work on weekends (true) or not (false)';
