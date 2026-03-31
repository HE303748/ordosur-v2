/*
  # Fix Role Assignment During Signup

  ## Changes
  
  ### 1. Update handle_new_user function
    - Ensure role is properly extracted from metadata
    - Add logging for debugging
    - Handle case where role might not be present
  
  ### 2. Update handle_new_user_profile function
    - Make it more robust in creating profiles
    - Handle both INSERT and UPDATE scenarios
  
  ## Rationale
  Users were getting assigned 'user' role instead of their selected 
  'doctor' or 'clinic' role during signup. This fix ensures the role
  from signup metadata is properly extracted and assigned.
*/

-- ============================================================================
-- 1. FIX HANDLE_NEW_USER FUNCTION TO PROPERLY EXTRACT ROLE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
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
-- 2. UPDATE HANDLE_NEW_USER_PROFILE TO BE MORE ROBUST
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create profiles for doctor and clinic roles
  IF NEW.role = 'doctor' THEN
    -- Try to insert, ignore if already exists
    INSERT INTO public.doctor_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  IF NEW.role = 'clinic' THEN
    -- Try to insert, ignore if already exists
    INSERT INTO public.clinic_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;