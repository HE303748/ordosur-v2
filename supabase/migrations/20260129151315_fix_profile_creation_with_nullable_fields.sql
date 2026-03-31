/*
  # Fix Profile Creation by Making Fields Nullable

  ## Problem
  The automatic trigger tries to create doctor/clinic profiles with only user_id,
  but many fields are marked NOT NULL, causing the trigger to fail.

  ## Solution
  Make non-critical fields nullable so the trigger can create empty profiles,
  which the application will then populate with actual data.

  ## Changes
  
  ### 1. Modify doctor_profiles table
    - Make full_name nullable (will be updated after creation)
    - Make medical_license_number nullable (will be updated after creation)
    - Make rpps_number nullable (will be updated after creation)
    - Make phone_number nullable (will be updated after creation)
    - Keep user_id and timestamps NOT NULL
  
  ### 2. Modify clinic_profiles table
    - Make clinic_name nullable (will be updated after creation)
    - Make business_registration_number nullable (will be updated after creation)
    - Make address fields nullable (will be updated after creation)
    - Make primary_contact_name nullable (will be updated after creation)
    - Make phone_number nullable (will be updated after creation)
    - Keep user_id and timestamps NOT NULL
  
  ### 3. Update trigger to populate default values
    - Set empty strings for text fields to avoid nulls
    - Set empty arrays for array fields

  ## Security
  - No changes to RLS policies
  - Maintains data integrity through application-level validation
  - Users can only update their own profiles
*/

-- ============================================================================
-- 1. MODIFY DOCTOR_PROFILES TABLE
-- ============================================================================

-- Drop NOT NULL constraints
ALTER TABLE doctor_profiles 
  ALTER COLUMN full_name DROP NOT NULL,
  ALTER COLUMN medical_license_number DROP NOT NULL,
  ALTER COLUMN rpps_number DROP NOT NULL,
  ALTER COLUMN phone_number DROP NOT NULL;

-- Drop unique constraints temporarily to allow empty/null values during creation
ALTER TABLE doctor_profiles 
  DROP CONSTRAINT IF EXISTS doctor_profiles_medical_license_number_key;
  
ALTER TABLE doctor_profiles 
  DROP CONSTRAINT IF EXISTS doctor_profiles_rpps_number_key;

-- ============================================================================
-- 2. MODIFY CLINIC_PROFILES TABLE
-- ============================================================================

-- Drop NOT NULL constraints
ALTER TABLE clinic_profiles
  ALTER COLUMN clinic_name DROP NOT NULL,
  ALTER COLUMN business_registration_number DROP NOT NULL,
  ALTER COLUMN address_street DROP NOT NULL,
  ALTER COLUMN address_city DROP NOT NULL,
  ALTER COLUMN address_postal_code DROP NOT NULL,
  ALTER COLUMN primary_contact_name DROP NOT NULL,
  ALTER COLUMN phone_number DROP NOT NULL;

-- Drop unique constraint temporarily to allow empty/null values during creation
ALTER TABLE clinic_profiles
  DROP CONSTRAINT IF EXISTS clinic_profiles_business_registration_number_key;

-- ============================================================================
-- 3. UPDATE TRIGGER FUNCTION TO SET DEFAULT VALUES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create doctor profile with default values if role is doctor
  IF NEW.role = 'doctor' THEN
    INSERT INTO public.doctor_profiles (
      user_id,
      full_name,
      medical_license_number,
      specialization,
      rpps_number,
      phone_number
    )
    VALUES (
      NEW.id,
      '',
      '',
      '{}',
      '',
      ''
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  -- Create clinic profile with default values if role is clinic
  IF NEW.role = 'clinic' THEN
    INSERT INTO public.clinic_profiles (
      user_id,
      clinic_name,
      business_registration_number,
      address_street,
      address_city,
      address_postal_code,
      address_country,
      primary_contact_name,
      phone_number
    )
    VALUES (
      NEW.id,
      '',
      '',
      '',
      '',
      '',
      'France',
      '',
      ''
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. ADD VALIDATION FUNCTION (OPTIONAL)
-- ============================================================================

-- Function to check if profile is complete
CREATE OR REPLACE FUNCTION is_doctor_profile_complete(doctor_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_complete boolean;
BEGIN
  SELECT 
    full_name IS NOT NULL AND full_name != '' AND
    medical_license_number IS NOT NULL AND medical_license_number != '' AND
    rpps_number IS NOT NULL AND rpps_number != '' AND
    phone_number IS NOT NULL AND phone_number != ''
  INTO profile_complete
  FROM doctor_profiles
  WHERE user_id = doctor_user_id;
  
  RETURN COALESCE(profile_complete, false);
END;
$$;

CREATE OR REPLACE FUNCTION is_clinic_profile_complete(clinic_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_complete boolean;
BEGIN
  SELECT 
    clinic_name IS NOT NULL AND clinic_name != '' AND
    business_registration_number IS NOT NULL AND business_registration_number != '' AND
    address_street IS NOT NULL AND address_street != '' AND
    primary_contact_name IS NOT NULL AND primary_contact_name != ''
  INTO profile_complete
  FROM clinic_profiles
  WHERE user_id = clinic_user_id;
  
  RETURN COALESCE(profile_complete, false);
END;
$$;
