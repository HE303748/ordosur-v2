/*
  # Fix User Profile Creation with Role

  ## Changes
  
  ### 1. Update handle_new_user function
    - Extract role from user metadata during signup
    - Create user_profiles with role from the start
  
  ### 2. Update handle_new_user_profile trigger
    - Fire on both INSERT and UPDATE
    - Check if role changed to create appropriate profile
    - Handle role updates
  
  ## Rationale
  Ensures role is set immediately when user signs up, and profile
  tables are created automatically via trigger.
*/

-- ============================================================================
-- 1. UPDATE HANDLE_NEW_USER FUNCTION TO INCLUDE ROLE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
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
    COALESCE(new.raw_user_meta_data->>'role', 'user')
  );
  RETURN new;
END;
$$;

-- ============================================================================
-- 2. UPDATE HANDLE_NEW_USER_PROFILE TO FIRE ON INSERT AND UPDATE
-- ============================================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_user_profile_created ON user_profiles;

-- Recreate trigger to fire on both INSERT and UPDATE
CREATE TRIGGER on_user_profile_created
  AFTER INSERT OR UPDATE OF role ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();