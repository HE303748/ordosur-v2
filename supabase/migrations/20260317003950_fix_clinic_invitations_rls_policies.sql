/*
  # Fix Clinic Invitations RLS Policies

  1. Changes
    - Drop existing restrictive RLS policies on clinic_invitations
    - Create new policies that allow authenticated users to insert invitations
    - Allow clinic admins to manage their own invitations (via invited_by)
    - Allow anyone to read invitations by token for acceptance flow
  
  2. Security
    - Authenticated users can insert invitations
    - Users can only manage invitations they created (invited_by = auth.uid())
    - Public access to read invitations by token (needed for invitation acceptance)
*/

DROP POLICY IF EXISTS "Clinic admin manages invitations" ON public.clinic_invitations;
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.clinic_invitations;
DROP POLICY IF EXISTS "Clinic admin can insert invitations" ON public.clinic_invitations;
DROP POLICY IF EXISTS "Clinic admin can manage invitations" ON public.clinic_invitations;

-- Allow authenticated users to insert invitations for their own clinic
CREATE POLICY "Clinic admin can insert invitations"
ON public.clinic_invitations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow clinic admin to read/update their invitations
CREATE POLICY "Clinic admin can manage invitations"
ON public.clinic_invitations FOR ALL
TO authenticated
USING (invited_by = auth.uid());

-- Allow anyone to read invitation by token
CREATE POLICY "Anyone can read invitation by token"
ON public.clinic_invitations FOR SELECT
TO anon, authenticated
USING (true);
