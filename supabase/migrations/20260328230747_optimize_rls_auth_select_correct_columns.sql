/*
  # Optimize RLS Policies with SELECT for auth functions

  1. Changes
    - Replace all direct auth.uid() calls with (SELECT auth.uid())
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Tables Updated
    - clinic_invitations
    - user_profiles (id column)
    - doctor_profiles (user_id column)
    - doctors
    - patients

  3. Performance Impact
    - Auth function is called once per query instead of once per row
    - Reduces CPU usage and improves response times
*/

-- ============================================================
-- CLINIC_INVITATIONS
-- ============================================================

DROP POLICY IF EXISTS "Clinic admin can manage invitations" ON public.clinic_invitations;

CREATE POLICY "Clinic admin can manage invitations"
ON public.clinic_invitations FOR ALL
TO authenticated
USING (invited_by = (SELECT auth.uid()));

-- ============================================================
-- USER_PROFILES (uses 'id' column for auth.uid())
-- ============================================================

DROP POLICY IF EXISTS "Users can read own user_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own user_profile" ON public.user_profiles;

CREATE POLICY "Users can read own user_profile"
ON public.user_profiles FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own user_profile"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================
-- DOCTOR_PROFILES (uses 'user_id' column)
-- ============================================================

DROP POLICY IF EXISTS "Users can read own doctor_profile" ON public.doctor_profiles;
DROP POLICY IF EXISTS "Users can update own doctor_profile" ON public.doctor_profiles;

CREATE POLICY "Users can read own doctor_profile"
ON public.doctor_profiles FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own doctor_profile"
ON public.doctor_profiles FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================
-- DOCTORS
-- ============================================================

DROP POLICY IF EXISTS "Doctors see own clinic members" ON public.doctors;
DROP POLICY IF EXISTS "Clinic admin can insert doctors" ON public.doctors;
DROP POLICY IF EXISTS "Clinic admin can update doctors" ON public.doctors;
DROP POLICY IF EXISTS "Clinic admin can delete doctors" ON public.doctors;

-- Doctors can see other doctors in their clinic
CREATE POLICY "Doctors see own clinic members"
ON public.doctors FOR SELECT
TO authenticated
USING (
  clinic_id = (
    SELECT clinic_id FROM user_profiles WHERE id = (SELECT auth.uid())
  )
  OR clinic_id IS NULL
);

-- Clinic admin can insert doctors
CREATE POLICY "Clinic admin can insert doctors"
ON public.doctors FOR INSERT
TO authenticated
WITH CHECK (
  clinic_id = (
    SELECT clinic_id FROM user_profiles WHERE id = (SELECT auth.uid())
  )
  AND
  (SELECT role FROM user_profiles WHERE id = (SELECT auth.uid())) = 'clinic_admin'
);

-- Clinic admin can update doctors
CREATE POLICY "Clinic admin can update doctors"
ON public.doctors FOR UPDATE
TO authenticated
USING (
  clinic_id = (
    SELECT clinic_id FROM user_profiles WHERE id = (SELECT auth.uid())
  )
  AND
  (SELECT role FROM user_profiles WHERE id = (SELECT auth.uid())) = 'clinic_admin'
)
WITH CHECK (
  clinic_id = (
    SELECT clinic_id FROM user_profiles WHERE id = (SELECT auth.uid())
  )
  AND
  (SELECT role FROM user_profiles WHERE id = (SELECT auth.uid())) = 'clinic_admin'
);

-- Clinic admin can delete doctors
CREATE POLICY "Clinic admin can delete doctors"
ON public.doctors FOR DELETE
TO authenticated
USING (
  clinic_id = (
    SELECT clinic_id FROM user_profiles WHERE id = (SELECT auth.uid())
  )
  AND
  (SELECT role FROM user_profiles WHERE id = (SELECT auth.uid())) = 'clinic_admin'
);

-- ============================================================
-- PATIENTS
-- ============================================================

DROP POLICY IF EXISTS "Doctors see own patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic admin sees all clinic patients" ON public.patients;

-- Doctors can manage their own patients
CREATE POLICY "Doctors see own patients"
ON public.patients FOR ALL
TO authenticated
USING (
  doctor_id IN (
    SELECT d.id FROM public.doctors d
    WHERE d.email IN (
      SELECT email FROM public.user_profiles WHERE id = (SELECT auth.uid())
    )
  )
);

-- Clinic admin can see all clinic patients
CREATE POLICY "Clinic admin sees all clinic patients"
ON public.patients FOR SELECT
TO authenticated
USING (
  doctor_id IN (
    SELECT d.id FROM public.doctors d
    WHERE d.clinic_id = (
      SELECT clinic_id FROM public.user_profiles WHERE id = (SELECT auth.uid())
    )
  )
  AND
  (SELECT role FROM public.user_profiles WHERE id = (SELECT auth.uid())) = 'clinic_admin'
);
