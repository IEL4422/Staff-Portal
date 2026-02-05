/*
  # Add RLS policy for anonymous login

  1. Security Changes
    - Add policy to allow anonymous users to SELECT from users table
    - This is needed for the login endpoint to query user credentials
    - Policy is restrictive: allows SELECT only, no other operations
    
  Note: This policy is only needed if using anon key for backend.
  Best practice is to use service role key instead.
*/

-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- Add policy for authenticated users to read own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Add policy for anonymous users to read user data (for login)
CREATE POLICY "Allow anon to read users for login"
  ON users
  FOR SELECT
  TO anon
  USING (true);
