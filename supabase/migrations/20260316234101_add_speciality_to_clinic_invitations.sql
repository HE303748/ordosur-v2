/*
  # Add Speciality Field to Clinic Invitations

  1. Changes
    - Add `speciality` column to clinic_invitations table to store the medical speciality of invited doctors
  
  2. Notes
    - Uses IF NOT EXISTS check to safely add the column
    - Nullable field as it's optional during invitation
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinic_invitations' AND column_name = 'speciality'
  ) THEN
    ALTER TABLE public.clinic_invitations ADD COLUMN speciality text;
  END IF;
END $$;
