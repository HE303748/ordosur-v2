/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - Admin policies on user_profiles table query user_profiles within the policy
    - This creates infinite recursion when any user tries to SELECT from user_profiles
    - Error: "infinite recursion detected in policy for relation user_profiles"

  2. Solution
    - Drop existing admin policies that cause recursion
    - Use auth.jwt() to check user role from JWT metadata instead of querying table
    - JWT contains role information set during signup, avoiding circular dependency

  3. Changes
    - Drop admin policies: "Admins can view all profiles", "Admins can update all profiles", "Admins can delete profiles"
    - Recreate them using auth.jwt() -> 'user_metadata' -> 'role' check
    - This avoids querying user_profiles table within its own RLS policy

  4. Security
    - Maintains same security model: admins can view/update/delete all profiles
    - Regular users can only view/update their own profile
    - No loss of functionality, just removes the recursion bug
*/

-- Drop existing admin policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Recreate admin policies using JWT metadata to avoid recursion
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );