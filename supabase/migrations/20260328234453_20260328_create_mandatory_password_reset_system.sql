/*
  # Mandatory Password Reset System for Medical Platform

  ## Overview
  This migration implements a comprehensive mandatory password reset system
  for doctor accounts created by clinic administrators, following healthcare
  software security standards and OWASP guidelines.

  ## New Tables

  ### 1. password_reset_requirements
  Tracks users who must reset their password before accessing the system
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users) - User required to reset password
  - `reason` (text) - Why password reset is required
  - `required_at` (timestamptz) - When requirement was set
  - `expires_at` (timestamptz) - When temporary credentials expire
  - `completed_at` (timestamptz) - When user completed password reset
  - `created_by` (uuid) - Admin who created the requirement
  - `is_active` (boolean) - Whether requirement is still active

  ### 2. temporary_credentials
  Stores information about temporary passwords (not the passwords themselves)
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users) - User with temporary password
  - `created_by` (uuid) - Admin who created temporary password
  - `expires_at` (timestamptz) - When temporary password expires
  - `used_at` (timestamptz) - When temporary password was first used
  - `is_valid` (boolean) - Whether temporary password is still valid
  - `created_at` (timestamptz)

  ### 3. authentication_events
  Comprehensive audit log for all authentication events
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User involved in event
  - `event_type` (text) - Type of event (login, password_reset, account_created, etc.)
  - `event_details` (jsonb) - Additional event metadata
  - `ip_address` (text) - IP address of request
  - `user_agent` (text) - Browser/client user agent
  - `success` (boolean) - Whether event was successful
  - `failure_reason` (text) - Reason for failure if applicable
  - `created_at` (timestamptz)

  ## Security Features
  
  1. **Temporary Password Expiration**
     - Temporary passwords expire after 7 days
     - Can only be used once for initial login
     - Automatically invalidated after password reset
  
  2. **Password Reset Requirements**
     - Users flagged for mandatory reset cannot access system until complete
     - Requirements can expire (forcing account lock)
     - Full audit trail of who created requirement and when
  
  3. **Comprehensive Audit Logging**
     - All authentication events logged with full context
     - IP addresses and user agents tracked
     - Success/failure tracking for security monitoring
  
  4. **Row Level Security**
     - All tables have RLS enabled
     - Users can only view their own records
     - Admins have elevated access for management
  
  ## Important Notes
  
  - Passwords themselves are NEVER stored in these tables
  - All password handling is done through Supabase Auth
  - This system tracks PASSWORD RESET REQUIREMENTS, not passwords
  - Temporary password metadata is stored, not actual passwords
*/

-- ============================================================================
-- 1. CREATE PASSWORD_RESET_REQUIREMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_reset_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'Temporary password issued - mandatory reset required',
  required_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE password_reset_requirements ENABLE ROW LEVEL SECURITY;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_req_user_id 
  ON password_reset_requirements(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_req_active 
  ON password_reset_requirements(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_password_reset_req_expires 
  ON password_reset_requirements(expires_at) WHERE is_active = true;

-- RLS Policies
CREATE POLICY "Users can view own password reset requirements"
  ON password_reset_requirements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Clinic admins can view their doctors' requirements"
  ON password_reset_requirements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up1
      JOIN user_profiles up2 ON up1.clinic_id = up2.clinic_id
      WHERE up1.id = auth.uid() 
        AND up1.role IN ('clinic', 'clinic_admin')
        AND up2.id = password_reset_requirements.user_id
    )
  );

CREATE POLICY "Clinic admins can insert password reset requirements"
  ON password_reset_requirements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
        AND role IN ('clinic', 'clinic_admin')
    )
  );

CREATE POLICY "Clinic admins can update their created requirements"
  ON password_reset_requirements
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ============================================================================
-- 2. CREATE TEMPORARY_CREDENTIALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS temporary_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  is_valid boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE temporary_credentials ENABLE ROW LEVEL SECURITY;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_temp_creds_user_id 
  ON temporary_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_temp_creds_valid 
  ON temporary_credentials(is_valid) WHERE is_valid = true;

-- RLS Policies
CREATE POLICY "Users can view own temporary credentials status"
  ON temporary_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Clinic admins can view their doctors' temp credentials"
  ON temporary_credentials
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up1
      JOIN user_profiles up2 ON up1.clinic_id = up2.clinic_id
      WHERE up1.id = auth.uid() 
        AND up1.role IN ('clinic', 'clinic_admin')
        AND up2.id = temporary_credentials.user_id
    )
  );

CREATE POLICY "Clinic admins can insert temporary credentials"
  ON temporary_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
        AND role IN ('clinic', 'clinic_admin')
    )
  );

CREATE POLICY "System can update temporary credentials"
  ON temporary_credentials
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = created_by)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = created_by);

-- ============================================================================
-- 3. CREATE AUTHENTICATION_EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS authentication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  event_type text NOT NULL CHECK (
    event_type IN (
      'account_created',
      'login_success',
      'login_failure',
      'password_reset_requested',
      'password_reset_completed',
      'mandatory_reset_required',
      'mandatory_reset_completed',
      'temporary_password_used',
      'account_locked',
      'account_unlocked',
      'email_verified',
      'session_expired'
    )
  ),
  event_details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE authentication_events ENABLE ROW LEVEL SECURITY;

-- Indexes for performance and querying
CREATE INDEX IF NOT EXISTS idx_auth_events_user_id 
  ON authentication_events(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_email 
  ON authentication_events(email);
CREATE INDEX IF NOT EXISTS idx_auth_events_type 
  ON authentication_events(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_events_created 
  ON authentication_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_events_success 
  ON authentication_events(success);

-- RLS Policies
CREATE POLICY "Users can view own authentication events"
  ON authentication_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Clinic admins can view their doctors' events"
  ON authentication_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up1
      JOIN user_profiles up2 ON up1.clinic_id = up2.clinic_id
      WHERE up1.id = auth.uid() 
        AND up1.role IN ('clinic', 'clinic_admin', 'admin')
        AND up2.id = authentication_events.user_id
    )
  );

CREATE POLICY "System can insert authentication events"
  ON authentication_events
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has mandatory password reset requirement
CREATE OR REPLACE FUNCTION check_mandatory_password_reset(check_user_id uuid)
RETURNS TABLE(
  requires_reset boolean,
  reason text,
  expires_at timestamptz,
  has_temporary_password boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(prr.is_active, false) as requires_reset,
    prr.reason,
    prr.expires_at,
    COALESCE(tc.is_valid, false) as has_temporary_password
  FROM auth.users u
  LEFT JOIN password_reset_requirements prr 
    ON u.id = prr.user_id 
    AND prr.is_active = true 
    AND prr.completed_at IS NULL
    AND prr.expires_at > now()
  LEFT JOIN temporary_credentials tc 
    ON u.id = tc.user_id 
    AND tc.is_valid = true
    AND tc.expires_at > now()
  WHERE u.id = check_user_id;
END;
$$;

-- Function to mark password reset as completed
CREATE OR REPLACE FUNCTION complete_mandatory_password_reset(reset_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Mark all active password reset requirements as completed
  UPDATE password_reset_requirements
  SET 
    completed_at = now(),
    is_active = false,
    updated_at = now()
  WHERE user_id = reset_user_id
    AND is_active = true
    AND completed_at IS NULL;

  -- Invalidate temporary credentials
  UPDATE temporary_credentials
  SET is_valid = false
  WHERE user_id = reset_user_id
    AND is_valid = true;

  -- Log the event
  INSERT INTO authentication_events (
    user_id,
    email,
    event_type,
    success,
    event_details
  )
  SELECT 
    reset_user_id,
    u.email,
    'mandatory_reset_completed',
    true,
    jsonb_build_object('completed_at', now())
  FROM auth.users u
  WHERE u.id = reset_user_id;
END;
$$;

-- Function to create mandatory password reset requirement
CREATE OR REPLACE FUNCTION create_mandatory_password_reset(
  target_user_id uuid,
  admin_user_id uuid,
  reset_reason text DEFAULT 'Temporary password issued - mandatory reset required'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  requirement_id uuid;
BEGIN
  -- Insert password reset requirement
  INSERT INTO password_reset_requirements (
    user_id,
    reason,
    created_by,
    is_active
  )
  VALUES (
    target_user_id,
    reset_reason,
    admin_user_id,
    true
  )
  RETURNING id INTO requirement_id;

  -- Insert temporary credentials record
  INSERT INTO temporary_credentials (
    user_id,
    created_by,
    is_valid
  )
  VALUES (
    target_user_id,
    admin_user_id,
    true
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    created_by = admin_user_id,
    expires_at = now() + interval '7 days',
    is_valid = true,
    used_at = NULL,
    created_at = now();

  -- Log the event
  INSERT INTO authentication_events (
    user_id,
    email,
    event_type,
    success,
    event_details
  )
  SELECT 
    target_user_id,
    u.email,
    'mandatory_reset_required',
    true,
    jsonb_build_object(
      'created_by', admin_user_id,
      'reason', reset_reason,
      'requirement_id', requirement_id
    )
  FROM auth.users u
  WHERE u.id = target_user_id;

  RETURN requirement_id;
END;
$$;

-- Function to mark temporary password as used
CREATE OR REPLACE FUNCTION mark_temporary_password_used(use_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update temporary credentials
  UPDATE temporary_credentials
  SET used_at = now()
  WHERE user_id = use_user_id
    AND is_valid = true
    AND used_at IS NULL;

  -- Log the event
  INSERT INTO authentication_events (
    user_id,
    email,
    event_type,
    success,
    event_details
  )
  SELECT 
    use_user_id,
    u.email,
    'temporary_password_used',
    true,
    jsonb_build_object('first_use_at', now())
  FROM auth.users u
  WHERE u.id = use_user_id;
END;
$$;

-- Function to log authentication event
CREATE OR REPLACE FUNCTION log_auth_event(
  log_user_id uuid,
  log_email text,
  log_event_type text,
  log_success boolean DEFAULT true,
  log_failure_reason text DEFAULT NULL,
  log_details jsonb DEFAULT '{}'::jsonb,
  log_ip_address text DEFAULT NULL,
  log_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO authentication_events (
    user_id,
    email,
    event_type,
    success,
    failure_reason,
    event_details,
    ip_address,
    user_agent
  )
  VALUES (
    log_user_id,
    log_email,
    log_event_type,
    log_success,
    log_failure_reason,
    log_details,
    log_ip_address,
    log_user_agent
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on password_reset_requirements
DROP TRIGGER IF EXISTS on_password_reset_req_updated ON password_reset_requirements;
CREATE TRIGGER on_password_reset_req_updated
  BEFORE UPDATE ON password_reset_requirements
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 6. GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION check_mandatory_password_reset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_mandatory_password_reset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_mandatory_password_reset(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_temporary_password_used(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION log_auth_event(uuid, text, text, boolean, text, jsonb, text, text) TO authenticated, anon;
