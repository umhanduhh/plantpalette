-- Fixes for Supabase database linter warnings.
-- Apply this in the Supabase SQL editor.

-- 1. Pin search_path on handle_new_user (function_search_path_mutable).
-- Without this, a SECURITY DEFINER function resolves unqualified names
-- (like "public.users") against whatever search_path the caller has set,
-- which is a privilege-escalation vector.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. handle_new_user is only ever invoked by the on_auth_user_created
-- trigger, never directly via RPC -- revoke the default anon/authenticated
-- EXECUTE grants entirely (anon_security_definer_function_executable,
-- authenticated_security_definer_function_executable).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 3. get_newsfeed must stay SECURITY DEFINER (it reads across users'
-- food_logs), but it should require login. Supabase's default privileges
-- grant EXECUTE to anon on every new function in public, so the
-- authenticated-only GRANT in newsfeed-migration.sql never actually locked
-- anon out. Revoke it explicitly.
REVOKE EXECUTE ON FUNCTION public.get_newsfeed(DATE, DATE, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_newsfeed(DATE, DATE, UUID) TO authenticated;
