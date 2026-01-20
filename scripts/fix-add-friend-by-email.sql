-- This function allows users to find other users by email address
-- It needs to be a security definer function because auth.users is not accessible to regular users

-- Drop the function if it exists to recreate it
DROP FUNCTION IF EXISTS find_user_by_email(TEXT);

CREATE OR REPLACE FUNCTION find_user_by_email(email_address TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user_id', id,
    'user_email', email
  ) INTO result
  FROM auth.users
  WHERE email = lower(email_address)
  LIMIT 1;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_user_by_email(TEXT) TO authenticated;
