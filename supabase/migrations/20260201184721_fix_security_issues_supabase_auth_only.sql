/*
  # Fix Critical Security Issues for Supabase Auth Tables
  
  This migration addresses security and performance issues in tables that use Supabase Auth.
  Legacy tables (users, patients, doctors, etc.) are left unchanged as they use a different auth system.
  
  ## CRITICAL SECURITY FIXES
  
  1. **Replace user_metadata with app_metadata for admin checks**
     - user_metadata is editable by end users and should NEVER be used for security
     - app_metadata can only be modified server-side and is safe for authorization
  
  2. **Optimize RLS policies with (select auth.function())**
     - Prevents re-evaluation of auth functions for each row
     - Significantly improves query performance at scale
  
  ## PERFORMANCE FIXES
  
  3. **Add missing indexes on foreign keys**
     - Add index on ordonnances.doctor_id for better join performance
  
  ## TABLES AFFECTED
  - user_profiles (admin policies, performance optimization)
  - doctor_profiles (add proper RLS if missing)
  - clinic_profiles (add proper RLS if missing)
  - login_attempts (keep permissive for auth tracking)
  
  ## LEGACY TABLES (NOT MODIFIED)
  The following tables use a legacy auth system and are not modified:
  - users (has password field, not using Supabase Auth)
  - patients, doctors, consultations, prescriptions, ordonnances
  - medications, drug_interactions, interaction_logs, doctor_performance
*/

-- ============================================================================
-- 1. FIX ADMIN POLICIES ON user_profiles - REPLACE user_metadata WITH app_metadata
-- ============================================================================

-- Drop existing admin policies that use insecure user_metadata
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Recreate with app_metadata + performance optimization using (select ...)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ============================================================================
-- 2. ADD PROPER RLS POLICIES FOR doctor_profiles IF MISSING
-- ============================================================================

-- Allow doctors to view all doctor profiles (for collaboration, referrals)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'doctor_profiles' 
    AND policyname = 'Doctors can view all profiles'
  ) THEN
    CREATE POLICY "Doctors can view all profiles"
      ON doctor_profiles
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END$$;

-- Doctors can only update/delete their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'doctor_profiles' 
    AND policyname = 'Doctors can update own profile'
  ) THEN
    CREATE POLICY "Doctors can update own profile"
      ON doctor_profiles
      FOR UPDATE
      TO authenticated
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()));
  END IF;
END$$;

-- ============================================================================
-- 3. ADD PROPER RLS POLICIES FOR clinic_profiles IF MISSING
-- ============================================================================

-- Clinics can only view their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clinic_profiles' 
    AND policyname = 'Clinics can view own profile'
  ) THEN
    CREATE POLICY "Clinics can view own profile"
      ON clinic_profiles
      FOR SELECT
      TO authenticated
      USING (user_id = (select auth.uid()));
  END IF;
END$$;

-- Clinics can only update their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clinic_profiles' 
    AND policyname = 'Clinics can update own profile'
  ) THEN
    CREATE POLICY "Clinics can update own profile"
      ON clinic_profiles
      FOR UPDATE
      TO authenticated
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()));
  END IF;
END$$;

-- ============================================================================
-- 4. ADD MISSING INDEX ON ordonnances.doctor_id
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ordonnances_doctor_id ON ordonnances(doctor_id);

-- ============================================================================
-- 5. ADD COMMENT ON SECURITY DEFINER VIEW
-- ============================================================================

COMMENT ON VIEW user_statistics IS 'SECURITY DEFINER view - executes with privileges of view owner. Required for aggregating user data across RLS boundaries. Review periodically to ensure it does not expose sensitive information.';

-- ============================================================================
-- 6. DOCUMENT LEGACY TABLES
-- ============================================================================

COMMENT ON TABLE users IS 'LEGACY TABLE: Uses custom authentication (has password field). Consider migrating to Supabase Auth (user_profiles, doctor_profiles, clinic_profiles).';
COMMENT ON TABLE patients IS 'LEGACY TABLE: References legacy users table via doctor_id foreign key.';
COMMENT ON TABLE doctors IS 'LEGACY TABLE: Separate from Supabase Auth system. New system uses doctor_profiles.';
COMMENT ON TABLE ordonnances IS 'LEGACY TABLE: References legacy users table via doctor_id foreign key.';
COMMENT ON TABLE consultations IS 'LEGACY TABLE: Part of legacy system referencing patients table.';
COMMENT ON TABLE prescriptions IS 'LEGACY TABLE: Part of legacy system referencing consultations table.';
COMMENT ON TABLE interaction_logs IS 'LEGACY TABLE: References legacy users table via doctor_id foreign key.';
COMMENT ON TABLE doctor_performance IS 'LEGACY TABLE: References legacy users table via doctor_id foreign key.';
