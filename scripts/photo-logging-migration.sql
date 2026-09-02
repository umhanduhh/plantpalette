-- Photo food logging migration
-- Apply this in the Supabase SQL editor.
--
-- Adds columns to food_logs for photo-identified entries (Gemini's visual
-- color read, identification confidence, and a source/source_image so a
-- log entry can point back at the plate photo it came from). All columns
-- are nullable/defaulted so existing manually-logged rows are unaffected.

-- 1. food_logs columns
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS color_category TEXT
  CHECK (color_category IN ('red', 'orange', 'yellow', 'green', 'blue', 'purple'));
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1);
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'photo'));
ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS source_image TEXT;

-- 2. Storage bucket for plate photos
--
-- Private bucket -- photos are only ever read back via the authenticated
-- Supabase client, never served as public URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('plate-photos', 'plate-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Users may only read/write objects under a top-level folder matching
-- their own auth.uid(), e.g. "plate-photos/<user_id>/<filename>.jpg".
CREATE POLICY "Users can upload their own plate photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'plate-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own plate photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'plate-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own plate photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'plate-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
