/*
  # Remove Unused Indexes

  1. Changes
    - Drop indexes that have not been used
    - Reduces storage overhead and write performance impact
    - Indexes can be recreated later if usage patterns change

  2. Indexes Removed
    - User profile indexes (email, role, user_id)
    - Doctor profile indexes (user_id)
    - Clinic profile indexes (user_id)
    - Patient indexes (doctor_id, nom)
    - Medication indexes (nom, classe)
    - Drug interaction indexes
    - Interaction log indexes
    - Consultation indexes
    - Ordonnances indexes
    - Doctor indexes (email, rpps)
    - Login attempt indexes
    - Sync log indexes
    - Profile indexes
    - Clinic invitation indexes

  3. Note
    - Kept foreign key indexes as they were just added for FK performance
*/

-- User Profiles
DROP INDEX IF EXISTS public.idx_user_profiles_email;
DROP INDEX IF EXISTS public.idx_user_profiles_role;

-- Doctor Profiles
DROP INDEX IF EXISTS public.idx_doctor_profiles_user_id;

-- Clinic Profiles
DROP INDEX IF EXISTS public.idx_clinic_profiles_user_id;

-- Patients
DROP INDEX IF EXISTS public.idx_patients_doctor_id;
DROP INDEX IF EXISTS public.idx_patients_nom;

-- Medications
DROP INDEX IF EXISTS public.idx_medications_nom;
DROP INDEX IF EXISTS public.idx_medications_classe;

-- Drug Interactions
DROP INDEX IF EXISTS public.idx_drug_interactions_meds;

-- Interaction Logs
DROP INDEX IF EXISTS public.idx_interaction_logs_doctor;
DROP INDEX IF EXISTS public.idx_interaction_logs_patient;
DROP INDEX IF EXISTS public.idx_interaction_logs_timestamp;

-- Consultations
DROP INDEX IF EXISTS public.idx_consultations_doctor;
DROP INDEX IF EXISTS public.idx_consultations_patient;
DROP INDEX IF EXISTS public.idx_consultations_date;

-- Ordonnances
DROP INDEX IF EXISTS public.idx_ordonnances_patient;
DROP INDEX IF EXISTS public.idx_ordonnances_doctor;
DROP INDEX IF EXISTS public.idx_ordonnances_created;

-- Doctors
DROP INDEX IF EXISTS public.idx_doctors_email;
DROP INDEX IF EXISTS public.idx_doctors_rpps;

-- Login Attempts
DROP INDEX IF EXISTS public.idx_login_attempts_email;
DROP INDEX IF EXISTS public.idx_login_attempts_attempted;

-- Sync Logs
DROP INDEX IF EXISTS public.idx_sync_logs_type;
DROP INDEX IF EXISTS public.idx_sync_logs_status;
DROP INDEX IF EXISTS public.idx_sync_logs_started;
DROP INDEX IF EXISTS public.idx_sync_logs_created_by;

-- Profiles
DROP INDEX IF EXISTS public.idx_profiles_user_id;

-- Clinic Invitations
DROP INDEX IF EXISTS public.idx_clinic_invitations_token;
DROP INDEX IF EXISTS public.idx_clinic_invitations_clinic_id;
