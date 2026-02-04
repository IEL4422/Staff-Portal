/*
  # Add is_admin column to users table

  1. Changes
    - Add `is_admin` boolean column to users table with default false
    - This allows admin users to have elevated privileges

  2. Security
    - No RLS policy changes needed - existing policies remain in effect
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;
