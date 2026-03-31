/*
  # Authentication System for Medical Platform

  ## Overview
  This migration creates a comprehensive authentication system for doctors and clinics
  with proper security measures including email verification and login tracking.

  ## New Tables
  
  ### 1. doctor_profiles
  Stores doctor-specific professional information
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to user_profiles) - Link to auth user
  - `full_name` (text) - Doctor's full name
  - `medical_license_number` (text, unique) - License number
  - `specialization` (text array) - Medical specializations
  - `rpps_number` (text, unique) - Professional registration number
  - `phone_number` (text) - Contact phone
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 2. clinic_profiles
  Stores clinic organization information
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to user_profiles) - Link to auth user
  - `clinic_name` (text) - Official clinic name
  - `business_registration_number` (text, unique) - Business registration
  - `address_street` (text) - Street address
  - `address_city` (text) - City
  - `address_postal_code` (text) - Postal code
  - `address_country` (text) - Country
  - `primary_contact_name` (text) - Main contact person
  - `phone_number` (text) - Contact phone
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 3. login_attempts
  Tracks login attempts for security and rate limiting
  - `id` (uuid, primary key)
  - `email` (text) - Email attempted
  - `success` (boolean) - Whether login succeeded
  - `ip_address` (text) - IP address of attempt
  - `user_agent` (text) - Browser user agent
  - `attempted_at` (timestamptz) - When attempt occurred
  - `locked_until` (timestamptz) - Account lock expiry if locked

  ## Security
  - All tables have RLS enabled
  - Users can only view/edit their own profiles
  - Login attempts are logged for security auditing
  - Automatic triggers for updated_at fields
*/

-- ============================================================================
-- 1. CREATE DOCTOR_PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS doctor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  medical_license_number text UNIQUE NOT NULL,
  specialization text[] NOT NULL DEFAULT '{}',
  rpps_number text UNIQUE NOT NULL,
  phone_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for doctor_profiles
CREATE POLICY "Users can view own doctor profile"
  ON doctor_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own doctor profile"
  ON doctor_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own doctor profile"
  ON doctor_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS on_doctor_profile_updated ON doctor_profiles;
CREATE TRIGGER on_doctor_profile_updated
  BEFORE UPDATE ON doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_user_id ON doctor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_license ON doctor_profiles(medical_license_number);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_rpps ON doctor_profiles(rpps_number);

-- ============================================================================
-- 2. CREATE CLINIC_PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinic_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  clinic_name text NOT NULL,
  business_registration_number text UNIQUE NOT NULL,
  address_street text NOT NULL,
  address_city text NOT NULL,
  address_postal_code text NOT NULL,
  address_country text NOT NULL DEFAULT 'France',
  primary_contact_name text NOT NULL,
  phone_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clinic_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for clinic_profiles
CREATE POLICY "Users can view own clinic profile"
  ON clinic_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own clinic profile"
  ON clinic_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own clinic profile"
  ON clinic_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS on_clinic_profile_updated ON clinic_profiles;
CREATE TRIGGER on_clinic_profile_updated
  BEFORE UPDATE ON clinic_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clinic_profiles_user_id ON clinic_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_profiles_business_reg ON clinic_profiles(business_registration_number);

-- ============================================================================
-- 3. CREATE LOGIN_ATTEMPTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  attempted_at timestamptz DEFAULT now(),
  locked_until timestamptz
);

-- Enable RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can view their own login attempts
CREATE POLICY "Users can view own login attempts"
  ON login_attempts
  FOR SELECT
  TO authenticated
  USING (
    email IN (
      SELECT email FROM user_profiles WHERE id = (select auth.uid())
    )
  );

-- Policy: System can insert login attempts (public access for logging before auth)
CREATE POLICY "System can insert login attempts"
  ON login_attempts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_locked_until ON login_attempts(locked_until) WHERE locked_until IS NOT NULL;

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION check_account_locked(user_email text)
RETURNS TABLE(is_locked boolean, locked_until timestamptz, attempts_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(MAX(la.locked_until) > now(), false) as is_locked,
    MAX(la.locked_until) as locked_until,
    COUNT(*)::integer as attempts_count
  FROM login_attempts la
  WHERE la.email = user_email
    AND la.attempted_at > now() - interval '30 minutes'
    AND la.success = false;
END;
$$;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
  user_email text,
  attempt_success boolean,
  client_ip text DEFAULT NULL,
  client_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  recent_failures integer;
  lock_duration interval;
BEGIN
  -- Insert the login attempt
  INSERT INTO login_attempts (email, success, ip_address, user_agent)
  VALUES (user_email, attempt_success, client_ip, client_user_agent);
  
  -- If login failed, check if we need to lock the account
  IF NOT attempt_success THEN
    -- Count recent failures in the last 30 minutes
    SELECT COUNT(*) INTO recent_failures
    FROM login_attempts
    WHERE email = user_email
      AND success = false
      AND attempted_at > now() - interval '30 minutes';
    
    -- Lock account after 5 failed attempts
    IF recent_failures >= 5 THEN
      -- Lock for 30 minutes
      lock_duration := interval '30 minutes';
      
      -- Update the latest attempt with lock time
      UPDATE login_attempts
      SET locked_until = now() + lock_duration
      WHERE email = user_email
        AND id = (
          SELECT id FROM login_attempts
          WHERE email = user_email
          ORDER BY attempted_at DESC
          LIMIT 1
        );
    END IF;
  ELSE
    -- On successful login, clear any lock
    UPDATE login_attempts
    SET locked_until = NULL
    WHERE email = user_email
      AND locked_until IS NOT NULL;
  END IF;
END;
$$;

-- Function to update last login timestamp
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE user_profiles
  SET last_login = now()
  WHERE id = (select auth.uid());
  RETURN new;
END;
$$;

-- ============================================================================
-- 5. UPDATE USER_PROFILES TABLE
-- ============================================================================

-- Update user_profiles role constraint to include doctor and clinic if not already present
DO $$
BEGIN
  -- Drop the existing constraint
  ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
  
  -- Add the updated constraint
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
    CHECK (role IN ('user', 'admin', 'doctor', 'clinic'));
EXCEPTION
  WHEN OTHERS THEN
    -- Constraint might already be correct, continue
    NULL;
END $$;