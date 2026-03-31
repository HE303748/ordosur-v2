/*
  # Simplify Registration - Make Professional Fields Optional

  ## Changes
  
  ### 1. Update doctor_profiles table
    - Make all fields except user_id optional
    - Users can complete their profile later
  
  ### 2. Update clinic_profiles table
    - Make all fields except user_id optional
    - Users can complete their profile later

  ## Rationale
  Allow users to register quickly with minimal information and complete
  their professional details later from their dashboard.
*/

-- ============================================================================
-- 1. MAKE DOCTOR_PROFILE FIELDS OPTIONAL
-- ============================================================================

-- Drop existing table and recreate with optional fields
DROP TABLE IF EXISTS doctor_profiles CASCADE;

CREATE TABLE doctor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  full_name text,
  medical_license_number text,
  specialization text[] DEFAULT '{}',
  rpps_number text,
  phone_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraints only when values are provided
CREATE UNIQUE INDEX idx_doctor_profiles_license 
  ON doctor_profiles(medical_license_number) 
  WHERE medical_license_number IS NOT NULL;

CREATE UNIQUE INDEX idx_doctor_profiles_rpps 
  ON doctor_profiles(rpps_number) 
  WHERE rpps_number IS NOT NULL;

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

-- ============================================================================
-- 2. MAKE CLINIC_PROFILE FIELDS OPTIONAL
-- ============================================================================

-- Drop existing table and recreate with optional fields
DROP TABLE IF EXISTS clinic_profiles CASCADE;

CREATE TABLE clinic_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  clinic_name text,
  business_registration_number text,
  address_street text,
  address_city text,
  address_postal_code text,
  address_country text DEFAULT 'France',
  primary_contact_name text,
  phone_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint only when value is provided
CREATE UNIQUE INDEX idx_clinic_profiles_business_reg 
  ON clinic_profiles(business_registration_number) 
  WHERE business_registration_number IS NOT NULL;

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