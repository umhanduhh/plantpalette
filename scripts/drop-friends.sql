-- Drop the friends feature from the database.
-- Apply this in the Supabase SQL editor AFTER the newsfeed feature has shipped.
--
-- weekly_reactions is intentionally left in place -- it now backs the
-- community newsfeed's rainbow reactions.

-- Friendships table (policies and indexes drop with it via CASCADE)
DROP TABLE IF EXISTS friendships CASCADE;

-- Email lookup RPC that only the friends "add by email" flow used
DROP FUNCTION IF EXISTS find_user_by_email(TEXT);
