/*
  # Remove Duplicate Permissive Policies

  1. Changes
    - Remove duplicate SELECT/INSERT/UPDATE/DELETE policies
    - Keep only the most appropriate policy for each action
    - Consolidate overlapping permissions into single policies

  2. Tables Affected
    - clinic_invitations
    - doctor_profiles
    - doctors
    - patients
    - user_profiles

  3. Security
    - No reduction in security, just consolidation
    - Cleaner policy structure improves maintainability
*/

-- ============================================================
-- CLINIC_INVITATIONS - Remove duplicates
-- ============================================================

-- Keep "Clinic admin can manage invitations" (covers all actions)
-- Remove separate insert policy since FOR ALL covers it
DROP POLICY IF EXISTS "Clinic admin can insert invitations" ON public.clinic_invitations;

-- Keep only one public read policy
DROP POLICY IF EXISTS "Public can read invitations by token" ON public.clinic_invitations;

-- ============================================================
-- DOCTOR_PROFILES - Remove duplicates
-- ============================================================

-- Keep the newer named policies, drop old ones
DROP POLICY IF EXISTS "Doctors can view own profile" ON public.doctor_profiles;
DROP POLICY IF EXISTS "Doctors can update own profile" ON public.doctor_profiles;

-- ============================================================
-- DOCTORS - Remove duplicates and consolidate
-- ============================================================

-- Remove duplicate user-level policies (keep clinic-level ones)
DROP POLICY IF EXISTS "Users can insert their own doctor record" ON public.doctors;
DROP POLICY IF EXISTS "Users can update their own doctor record" ON public.doctors;
DROP POLICY IF EXISTS "Users can delete their own doctor record" ON public.doctors;

-- Remove overly broad authenticated view policy
DROP POLICY IF EXISTS "Authenticated users can view doctors" ON public.doctors;

-- ============================================================
-- PATIENTS - Remove duplicates and consolidate
-- ============================================================

-- Keep "Doctors see own patients" which is FOR ALL
-- Remove separate action policies covered by FOR ALL
DROP POLICY IF EXISTS "Doctors can view own patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors can insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors can update own patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors can delete own patients" ON public.patients;

-- ============================================================
-- USER_PROFILES - Remove duplicates
-- ============================================================

-- Keep the newer named policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
