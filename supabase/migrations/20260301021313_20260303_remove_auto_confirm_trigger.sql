/*
  # Remove Auto-Confirmation Trigger and Enable Email Verification

  ## Problem
  Previous migration (20260201194019) auto-confirmed all users, preventing email verification.
  This caused:
  - confirmation_sent_at = NULL
  - confirmed_at = filled immediately
  - No verification emails sent
  
  ## Solution
  1. Drop dependent triggers and function with CASCADE
  2. Restore natural email confirmation flow
  3. Users will now receive and must verify confirmation email
  
  ## Important Actions Required
  Ensure in Supabase Dashboard:
  - Authentication → Providers → Email → "Confirm email" is ENABLED
  - Email provider configured (Resend or SendGrid)
*/

-- Drop all dependent triggers first
DROP TRIGGER IF EXISTS on_auth_user_updated_keep_confirmed ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;

-- Drop function with CASCADE to handle any remaining dependencies
DROP FUNCTION IF EXISTS auto_confirm_user() CASCADE;

DO $$
BEGIN
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'EMAIL VERIFICATION FLOW RESTORED';
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'Auto-confirmation triggers removed.';
  RAISE NOTICE 'Users will now receive verification emails on signup.';
  RAISE NOTICE '';
  RAISE NOTICE 'CRITICAL: Verify Supabase Dashboard settings:';
  RAISE NOTICE '1. Go to: Authentication → Providers → Email';
  RAISE NOTICE '2. "Confirm email" toggle MUST be ENABLED';
  RAISE NOTICE '3. Email provider must be configured (Resend recommended)';
  RAISE NOTICE '';
  RAISE NOTICE 'New users will receive verification emails.';
  RAISE NOTICE 'They must click the email link before login.';
  RAISE NOTICE '=======================================================================';
END $$;
