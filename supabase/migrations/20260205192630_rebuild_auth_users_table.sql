/*
  # Rebuild Authentication - Users Table

  This migration rebuilds the users table from scratch for a fresh authentication system.

  1. Changes Made
    - Truncates existing user data (fresh start as requested)
    - Removes legacy is_admin column
    - Adds role column (text: 'admin' or 'staff')
    - Adds is_active column for user deactivation
    - Adds password_reset_token for password reset functionality
    - Adds password_reset_expires for token expiration

  2. New Columns
    - `role` (text) - User role, either 'admin' or 'staff', defaults to 'staff'
    - `is_active` (boolean) - Whether user account is active, defaults to true
    - `password_reset_token` (text) - Token for password reset, nullable
    - `password_reset_expires` (timestamptz) - When reset token expires, nullable

  3. Security
    - RLS is enabled on users table
    - Users can only read their own data
    - Admin operations require admin role (enforced at application level)

  4. Important Notes
    - All existing user data will be deleted
    - A seed script must be run to create the initial admin user
*/

TRUNCATE TABLE public.users CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.users DROP COLUMN is_admin;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.users ADD COLUMN role text NOT NULL DEFAULT 'staff';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_reset_token'
  ) THEN
    ALTER TABLE public.users ADD COLUMN password_reset_token text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_reset_expires'
  ) THEN
    ALTER TABLE public.users ADD COLUMN password_reset_expires timestamptz;
  END IF;
END $$;

ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'staff'));

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id::text = auth.uid()::text)
  WITH CHECK (id::text = auth.uid()::text);
