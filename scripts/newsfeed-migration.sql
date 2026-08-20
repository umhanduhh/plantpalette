-- Newsfeed feature migration
-- Apply this in the Supabase SQL editor.
--
-- Adds a public last_name column, a SECURITY DEFINER newsfeed RPC that exposes
-- ONLY safe profile fields (never email) for fully-named users, and opens the
-- weekly_reactions table so any authenticated user can leave a single reaction.

-- 1. Public profile: last name (first name already exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 2. Newsfeed RPC
--
-- Returns each fully-named user's weekly activity: display name (First L.),
-- unique-food progress, their most recent foods, and rainbow reaction state.
-- SECURITY DEFINER so it can read across users, but it only ever returns the
-- columns below -- email and other users' full history stay private.
CREATE OR REPLACE FUNCTION public.get_newsfeed(
  p_week_start DATE,
  p_week_end DATE,
  p_viewer UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  weekly_unique_count INT,
  weekly_goal INT,
  recent_foods TEXT[],
  last_logged_at TIMESTAMPTZ,
  rainbow_count INT,
  viewer_has_rainbowed BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.first_name || ' ' || left(u.last_name, 1) || '.' AS display_name,
    COALESCE(w.unique_count, 0)::INT AS weekly_unique_count,
    u.weekly_goal,
    w.recent_foods,
    w.last_logged_at,
    COALESCE(r.cnt, 0)::INT AS rainbow_count,
    COALESCE(r.viewer, false) AS viewer_has_rainbowed
  FROM users u
  JOIN LATERAL (
    SELECT
      COUNT(DISTINCT fl.fdc_id) AS unique_count,
      MAX(fl.logged_at) AS last_logged_at,
      (ARRAY_AGG(fl.food_name ORDER BY fl.logged_at DESC))[1:5] AS recent_foods
    FROM food_logs fl
    WHERE fl.user_id = u.id
      AND fl.logged_date BETWEEN p_week_start AND p_week_end
  ) w ON w.last_logged_at IS NOT NULL
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) AS cnt,
      bool_or(wr.from_user_id = p_viewer) AS viewer
    FROM weekly_reactions wr
    WHERE wr.to_user_id = u.id
      AND wr.week_starting_date = p_week_start
  ) r ON true
  WHERE u.first_name IS NOT NULL AND u.first_name <> ''
    AND u.last_name IS NOT NULL AND u.last_name <> ''
  ORDER BY w.last_logged_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_newsfeed(DATE, DATE, UUID) TO authenticated;

-- 3. Open up weekly_reactions to all authenticated users
--
-- The friends feature limited reactions to accepted friends. The newsfeed
-- lets anyone leave a single rainbow reaction on anyone's week.
DROP POLICY IF EXISTS "Users can react to friends' progress" ON weekly_reactions;
DROP POLICY IF EXISTS "Users can view reactions on their progress" ON weekly_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON weekly_reactions;

CREATE POLICY "Anyone can view reactions"
  ON weekly_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own reaction"
  ON weekly_reactions FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update their own reaction"
  ON weekly_reactions FOR UPDATE
  USING (auth.uid() = from_user_id);

CREATE POLICY "Users can delete their own reaction"
  ON weekly_reactions FOR DELETE
  USING (auth.uid() = from_user_id);
