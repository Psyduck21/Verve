-- Migration: 0002_auto_sync_auth_users.sql
-- Creates a trigger that automatically syncs new auth.users rows
-- into public.users on sign-up (including OAuth providers like Google).

-- 1. Function to upsert public.users from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
    full_name    = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url   = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at   = now();
  RETURN NEW;
END;
$$;

-- 2. Trigger on auth.users (fires after INSERT or UPDATE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill existing auth users (idempotent)
INSERT INTO public.users (id, email, full_name, avatar_url)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email      = EXCLUDED.email,
  full_name  = COALESCE(EXCLUDED.full_name, public.users.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
  updated_at = now();
