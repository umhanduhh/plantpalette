-- Page view tracking for the business metrics dashboard.
-- Apply this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS page_views (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  path TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON page_views (created_at);
CREATE INDEX IF NOT EXISTS page_views_path_idx ON page_views (path);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Write-only from the API: any visitor (including anonymous) can log a
-- view, but nothing can read this table back over the REST/RPC API. The
-- dashboard tool connects with the direct Postgres connection string
-- (Settings -> Database in Supabase), which reads as the postgres role and
-- bypasses RLS entirely.
CREATE POLICY "Anyone can insert page views"
  ON page_views FOR INSERT
  WITH CHECK (true);
