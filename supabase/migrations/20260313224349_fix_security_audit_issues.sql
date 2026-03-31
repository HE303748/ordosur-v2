/*
  # Security Audit Fixes

  ## Critical Security Issues Fixed

  ### 1. Function Search Path Mutable (5 functions)
  Added `SET search_path = public` to all SECURITY DEFINER functions to prevent search_path injection attacks:
  - `handle_updated_at`
  - `check_account_locked`
  - `record_login_attempt`
  - `handle_new_user_complete`
  - `handle_new_user` (already had it, keeping for completeness)

  ### 2. RLS Policy Always True on `doctors` table
  Replaced overly permissive policies that used `true` condition with email-based ownership checks.
  The `doctors` table uses `email` as the identifier (not user_id).

  ### 3. RLS Policy Always True on `login_attempts` table
  Removed public insert policy. Login attempts should only be inserted via SECURITY DEFINER functions.

  ### 4. RLS Enabled No Policy on reference tables
  Added read-only policies for `medications` and `drug_interactions` tables.
  These are reference data tables that authenticated users need to read.

  ### 5. Password Security
  Added security reminder comment in code. Leaked password protection must be enabled in Supabase Dashboard.

  ## Security Improvements
  - All SECURITY DEFINER functions now have immutable search_path
  - All RLS policies are properly scoped to owners/authenticated users
  - Reference data tables have appropriate read-only access
  - Login attempts can only be inserted via system functions
*/

-- ============================================================================
-- FIX 1: Add SET search_path to all SECURITY DEFINER functions
-- ============================================================================

-- Function: handle_updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- Function: check_account_locked
CREATE OR REPLACE FUNCTION check_account_locked(user_email text)
RETURNS TABLE(is_locked boolean, locked_until timestamptz, attempts_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function: record_login_attempt
CREATE OR REPLACE FUNCTION record_login_attempt(
  user_email text,
  attempt_success boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO login_attempts (email, success)
  VALUES (user_email, attempt_success);
END;
$$;

-- Function: handle_new_user_complete
CREATE OR REPLACE FUNCTION handle_new_user_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Extract role from metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'doctor');
  
  -- Create user profile
  INSERT INTO public.user_profiles (id, full_name, email, email_confirmed, role, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.email_confirmed_at IS NOT NULL,
    user_role,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'active' ELSE 'pending' END
  )
  ON CONFLICT (id) DO UPDATE SET
    email_confirmed = NEW.email_confirmed_at IS NOT NULL,
    account_status = CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'active' ELSE user_profiles.account_status END;
  
  -- Create role-specific profile
  IF user_role = 'doctor' THEN
    INSERT INTO public.doctor_profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF user_role = 'clinic' THEN
    INSERT INTO public.clinic_profiles (user_id, clinic_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function: handle_new_user (already had SET search_path, recreating for completeness)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Extract role from metadata, default to 'user' if not present
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'user');
  
  -- Insert user profile with role from metadata
  INSERT INTO public.user_profiles (id, full_name, email, email_confirmed, account_status, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.email_confirmed_at IS NOT NULL,
    CASE 
      WHEN new.email_confirmed_at IS NOT NULL THEN 'active'
      ELSE 'pending'
    END,
    user_role
  );
  
  RETURN new;
END;
$$;

-- ============================================================================
-- FIX 2: Replace overly permissive RLS policies on doctors table
-- ============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can delete doctors" ON public.doctors;
DROP POLICY IF EXISTS "Authenticated users can insert doctors" ON public.doctors;
DROP POLICY IF EXISTS "Authenticated users can update doctors" ON public.doctors;

-- Create properly scoped policies based on email ownership
-- Note: The doctors table uses email as identifier, not user_id
CREATE POLICY "Users can insert their own doctor record"
ON public.doctors FOR INSERT
TO authenticated
WITH CHECK (
  email IN (
    SELECT user_profiles.email 
    FROM user_profiles 
    WHERE user_profiles.id = auth.uid()
  )
);

CREATE POLICY "Users can update their own doctor record"
ON public.doctors FOR UPDATE
TO authenticated
USING (
  email IN (
    SELECT user_profiles.email 
    FROM user_profiles 
    WHERE user_profiles.id = auth.uid()
  )
)
WITH CHECK (
  email IN (
    SELECT user_profiles.email 
    FROM user_profiles 
    WHERE user_profiles.id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own doctor record"
ON public.doctors FOR DELETE
TO authenticated
USING (
  email IN (
    SELECT user_profiles.email 
    FROM user_profiles 
    WHERE user_profiles.id = auth.uid()
  )
);

-- ============================================================================
-- FIX 3: Remove overly permissive login_attempts insert policy
-- ============================================================================

-- Drop the overly permissive policy that allows anon/authenticated to insert
DROP POLICY IF EXISTS "System can insert login attempts" ON public.login_attempts;

-- Create a restrictive policy: only service_role can insert
-- This ensures inserts only happen through SECURITY DEFINER functions
CREATE POLICY "Only service role can insert login attempts"
ON public.login_attempts FOR INSERT
TO service_role
WITH CHECK (true);

-- Note: The record_login_attempt function runs as SECURITY DEFINER,
-- so it can bypass RLS and insert records even though regular users cannot

-- ============================================================================
-- FIX 4: Add read policies for reference data tables
-- ============================================================================

-- Enable RLS on medications table (should already be enabled, but ensuring)
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read medications (reference data)
CREATE POLICY "Authenticated users can read medications"
ON public.medications FOR SELECT
TO authenticated
USING (true);

-- Enable RLS on drug_interactions table (should already be enabled)
ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read drug interactions (reference data)
CREATE POLICY "Authenticated users can read drug_interactions"
ON public.drug_interactions FOR SELECT
TO authenticated
USING (true);

-- Note: No INSERT/UPDATE/DELETE policies are added for these tables.
-- They should be managed by service_role or admin users only.

-- ============================================================================
-- Security Notes
-- ============================================================================

COMMENT ON TABLE public.medications IS 
'Public reference data - RLS enabled with read-only access for authenticated users. Updates should be done via service role or admin.';

COMMENT ON TABLE public.drug_interactions IS 
'Public reference data - RLS enabled with read-only access for authenticated users. Updates should be done via service role or admin.';

COMMENT ON FUNCTION check_account_locked IS 
'SECURITY DEFINER function with immutable search_path to prevent injection attacks';

COMMENT ON FUNCTION record_login_attempt IS 
'SECURITY DEFINER function with immutable search_path. Only way to insert login attempts due to RLS policy.';

COMMENT ON FUNCTION handle_new_user_complete IS 
'SECURITY DEFINER function with immutable search_path for automatic profile creation';

COMMENT ON FUNCTION handle_updated_at IS 
'SECURITY DEFINER function with immutable search_path for automatic timestamp updates';