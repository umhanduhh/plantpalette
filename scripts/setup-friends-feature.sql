-- Add first_name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;

-- Friendships table to track friend connections
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Weekly reactions table to track emoji reactions on friends' progress
CREATE TABLE IF NOT EXISTS weekly_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_starting_date DATE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- One reaction per user per friend per week
  UNIQUE(from_user_id, to_user_id, week_starting_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_weekly_reactions_to_user ON weekly_reactions(to_user_id, week_starting_date);
CREATE INDEX IF NOT EXISTS idx_weekly_reactions_from_user ON weekly_reactions(from_user_id);

-- Row Level Security Policies
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reactions ENABLE ROW LEVEL SECURITY;

-- Friendships policies
-- Users can view friendships where they are either the user or the friend
CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friend requests
CREATE POLICY "Users can create friend requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update friendships where they are the friend (to accept/reject)
CREATE POLICY "Users can respond to friend requests"
  ON friendships FOR UPDATE
  USING (auth.uid() = friend_id);

-- Users can delete friendships where they are involved
CREATE POLICY "Users can delete their friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Weekly reactions policies
-- Users can view reactions on their own progress
CREATE POLICY "Users can view reactions on their progress"
  ON weekly_reactions FOR SELECT
  USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

-- Users can create reactions on friends' progress
CREATE POLICY "Users can react to friends' progress"
  ON weekly_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
      AND ((user_id = auth.uid() AND friend_id = weekly_reactions.to_user_id)
        OR (friend_id = auth.uid() AND user_id = weekly_reactions.to_user_id))
    )
  );

-- Users can update their own reactions
CREATE POLICY "Users can update their own reactions"
  ON weekly_reactions FOR UPDATE
  USING (auth.uid() = from_user_id);
