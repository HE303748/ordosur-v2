/*
  # Add Missing Foreign Key Indexes

  1. New Indexes
    - Add index on clinic_invitations.invited_by for foreign key performance
    - Add index on doctor_profiles.clinic_id for foreign key performance
    - Add index on doctors.clinic_id for foreign key performance
    - Add index on user_profiles.clinic_id for foreign key performance

  2. Performance
    - These indexes improve JOIN and foreign key constraint performance
    - Prevents table scans when querying by foreign keys
*/

-- Add index for clinic_invitations.invited_by foreign key
CREATE INDEX IF NOT EXISTS idx_clinic_invitations_invited_by 
ON public.clinic_invitations(invited_by);

-- Add index for doctor_profiles.clinic_id foreign key
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_clinic_id 
ON public.doctor_profiles(clinic_id);

-- Add index for doctors.clinic_id foreign key
CREATE INDEX IF NOT EXISTS idx_doctors_clinic_id 
ON public.doctors(clinic_id);

-- Add index for user_profiles.clinic_id foreign key
CREATE INDEX IF NOT EXISTS idx_user_profiles_clinic_id 
ON public.user_profiles(clinic_id);
