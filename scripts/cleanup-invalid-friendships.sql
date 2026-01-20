-- This script removes invalid friendship records that were created before the fix
-- These records have friend_id values that don't exist in auth.users

-- First, let's see what invalid records exist (optional - for checking)
-- Uncomment the following query to see them before deleting:
/*
SELECT f.id, f.user_id, f.friend_id, f.status, f.created_at
FROM friendships f
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.id = f.friend_id
);
*/

-- Delete friendships where the friend_id doesn't exist in auth.users
DELETE FROM friendships
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.id = friend_id
);

-- Delete friendships where the user_id doesn't exist in auth.users (just in case)
DELETE FROM friendships
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.id = user_id
);

-- Show remaining friendships count
SELECT COUNT(*) as remaining_friendships FROM friendships;
