-- This function allows users to find other users by email address
-- It needs to be a security definer function because auth.users is not accessible to regular users

CREATE OR REPLACE FUNCTION find_user_by_email(email_address TEXT)
RETURNS TABLE (user_id UUID, user_email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT id as user_id, email as user_email
  FROM auth.users
  WHERE email = lower(email_address)
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_user_by_email(TEXT) TO authenticated;
