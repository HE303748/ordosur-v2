/*
  # Add Automatic Profile Creation Triggers

  ## Changes
  
  ### 1. Create trigger function for automatic profile creation
    - Automatically creates doctor_profiles or clinic_profiles when user_profiles is created
    - Runs with elevated privileges to bypass RLS
    - Ensures every user gets the appropriate profile type
  
  ### 2. Add trigger to user_profiles table
    - Fires after INSERT on user_profiles
    - Creates corresponding profile based on role
  
  ## Security
  - Trigger runs with SECURITY DEFINER to bypass RLS
  - Only creates profiles for valid roles (doctor/clinic)
  - Prevents orphaned user_profiles without corresponding role profiles

  ## Rationale
  This solves the RLS policy violation during signup by handling profile
  creation on the database side with elevated privileges.
*/

-- ============================================================================
-- 1. CREATE TRIGGER FUNCTION FOR AUTOMATIC PROFILE CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create doctor profile if role is doctor
  IF NEW.role = 'doctor' THEN
    INSERT INTO public.doctor_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  -- Create clinic profile if role is clinic
  IF NEW.role = 'clinic' THEN
    INSERT INTO public.clinic_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. ADD TRIGGER TO USER_PROFILES TABLE
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_user_profile_created ON user_profiles;

-- Create trigger that fires after INSERT
CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- ============================================================================
-- 3. GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Ensure the trigger function can insert into profile tables
GRANT INSERT ON doctor_profiles TO authenticated;
GRANT INSERT ON clinic_profiles TO authenticated;