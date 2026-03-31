/*
  # Add Email Confirmation Sync Trigger

  1. Purpose
    - Automatically sync email confirmation status from auth.users to user_profiles
    - Update account_status to 'active' when email is confirmed
    - Ensures user_profiles stays in sync with Supabase auth system

  2. Changes
    - Create trigger function to handle email confirmation updates
    - Create trigger on auth.users that fires when email_confirmed_at changes
    - Manually update existing users who have confirmed emails but unsynced profiles

  3. Security
    - Function executes with security definer to access both auth and public schemas
    - Only updates when email_confirmed_at changes from NULL to a value
*/

-- Create function to sync email confirmation status
CREATE OR REPLACE FUNCTION sync_email_confirmation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only update if email_confirmed_at was just set (changed from NULL to a value)
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.user_profiles
    SET 
      email_confirmed = true,
      account_status = 'active',
      updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to sync email confirmation
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION sync_email_confirmation();

-- Fix existing users who have confirmed emails but email_confirmed is still false
UPDATE public.user_profiles
SET 
  email_confirmed = true,
  account_status = 'active',
  updated_at = now()
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email_confirmed_at IS NOT NULL
)
AND email_confirmed = false;