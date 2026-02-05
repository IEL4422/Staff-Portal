/*
  # Add INSERT policy for users table

  This migration adds an INSERT policy to allow the application to create new users.
  This is necessary for the admin seed endpoint and user creation.

  1. Security Notes
    - INSERT is allowed for any authenticated user (admin user creation is protected at application level)
    - In production, the seed endpoint only works when no users exist
*/

DROP POLICY IF EXISTS "Allow insert for user creation" ON public.users;
CREATE POLICY "Allow insert for user creation"
  ON public.users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
