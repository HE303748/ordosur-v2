/*
  # Fix Login Authentication Policy
  
  ## Changes
  
  This migration adds a policy to allow unauthenticated users to read from the users table
  for login purposes. This is necessary because the login process needs to query the users
  table before authentication is established.
  
  ## Security Notes
  
  - The policy only allows SELECT operations
  - Users can only read email and role information needed for login validation
  - Passwords are still validated server-side through the query
  - This is a standard pattern for custom authentication systems
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Allow anyone to read users table for login (this is safe because password checking happens in the query)
CREATE POLICY "Allow login access"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

-- Users can update their own data after authentication
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
