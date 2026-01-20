-- Add first_name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
