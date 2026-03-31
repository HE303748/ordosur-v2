/*
  # Fix Overly Permissive Clinic Invitations Policy

  1. Changes
    - Replace "WITH CHECK (true)" with proper authorization check
    - Only allow clinic admins to insert invitations for their clinic
    - Separate INSERT policy from the ALL policy for better control

  2. Security
    - Prevents unauthorized users from creating invitations
    - Ensures invitations are only created by clinic admins
    - Validates clinic ownership before insertion
*/

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Clinic admin can manage invitations" ON public.clinic_invitations;

-- Create separate policies for better control
CREATE POLICY "Clinic admin can insert invitations"
ON public.clinic_invitations FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be inviting for their own clinic
  clinic_id IN (
    SELECT id FROM public.clinic_profiles WHERE user_id = (SELECT auth.uid())
  )
  AND
  -- User must be a clinic admin
  (SELECT role FROM public.user_profiles WHERE id = (SELECT auth.uid())) = 'clinic_admin'
  AND
  -- User must be the one creating the invitation
  invited_by = (SELECT auth.uid())
);

-- Allow clinic admins to manage (select/update/delete) their own invitations
CREATE POLICY "Clinic admin can manage own invitations"
ON public.clinic_invitations FOR SELECT
TO authenticated
USING (invited_by = (SELECT auth.uid()));

CREATE POLICY "Clinic admin can update own invitations"
ON public.clinic_invitations FOR UPDATE
TO authenticated
USING (invited_by = (SELECT auth.uid()))
WITH CHECK (invited_by = (SELECT auth.uid()));

CREATE POLICY "Clinic admin can delete own invitations"
ON public.clinic_invitations FOR DELETE
TO authenticated
USING (invited_by = (SELECT auth.uid()));
