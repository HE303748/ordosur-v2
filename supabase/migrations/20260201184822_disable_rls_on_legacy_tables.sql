/*
  # Disable RLS on Legacy Tables
  
  ## Context
  This migration temporarily DISABLES Row Level Security on legacy tables that use
  a custom authentication system (table: users with password field).
  
  ## Problem
  The current codebase has TWO parallel systems:
  1. NEW: Supabase Auth (auth.users → user_profiles → doctor_profiles/clinic_profiles)
  2. LEGACY: Custom Auth (users table with password → patients, ordonnances, etc.)
  
  The legacy tables have RLS policies that use USING (true), which defeats the purpose
  of RLS. These policies were flagged as security issues by Supabase.
  
  ## Why Disable RLS?
  - Legacy tables (users, patients, consultations, etc.) don't have proper links to auth.users
  - Can't use auth.uid() or auth.jwt() in RLS policies without proper FK to auth.users
  - Current "USING (true)" policies provide no security anyway
  - Application code handles authorization at the application layer
  
  ## SECURITY WARNING
  ⚠️ With RLS disabled, these tables are accessible to all authenticated users!
  This is a TEMPORARY solution. The proper fix is to migrate all legacy tables
  to use Supabase Auth by:
  1. Creating FKs from legacy tables to user_profiles or doctor_profiles
  2. Migrating data from users table to auth.users
  3. Re-enabling RLS with proper policies based on auth.uid()
  
  ## Tables Affected
  - users (legacy auth table with password)
  - patients (FK to users.id)
  - consultations (FK to patients.id)
  - prescriptions (FK to consultations.id and medications.id)
  - ordonnances (FK to users.id and patients.id)
  - medications (reference data)
  - drug_interactions (reference data)
  - interaction_logs (FK to users.id and patients.id)
  - doctor_performance (FK to users.id)
  - doctors (standalone legacy table)
*/

-- ============================================================================
-- DISABLE RLS ON LEGACY TABLES
-- ============================================================================

-- Legacy auth table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow email lookup for login" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Public can read users" ON users;
DROP POLICY IF EXISTS "Allow login access" ON users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON users;

-- Legacy patients table
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctors can view their patients" ON patients;
DROP POLICY IF EXISTS "Doctors can create patients" ON patients;
DROP POLICY IF EXISTS "Doctors can update their patients" ON patients;
DROP POLICY IF EXISTS "Doctors can delete their patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can view patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can update patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can delete patients" ON patients;

-- Legacy consultations table
ALTER TABLE consultations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctors can view consultations for their patients" ON consultations;
DROP POLICY IF EXISTS "Doctors can create consultations for their patients" ON consultations;
DROP POLICY IF EXISTS "Doctors can update consultations for their patients" ON consultations;
DROP POLICY IF EXISTS "Doctors can delete consultations for their patients" ON consultations;
DROP POLICY IF EXISTS "Authenticated users can view consultations" ON consultations;
DROP POLICY IF EXISTS "Authenticated users can insert consultations" ON consultations;
DROP POLICY IF EXISTS "Authenticated users can update consultations" ON consultations;
DROP POLICY IF EXISTS "Authenticated users can delete consultations" ON consultations;

-- Legacy prescriptions table
ALTER TABLE prescriptions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctors can view prescriptions for their consultations" ON prescriptions;
DROP POLICY IF EXISTS "Doctors can create prescriptions for their consultations" ON prescriptions;
DROP POLICY IF EXISTS "Doctors can update prescriptions for their consultations" ON prescriptions;
DROP POLICY IF EXISTS "Doctors can delete prescriptions for their consultations" ON prescriptions;
DROP POLICY IF EXISTS "Authenticated users can view prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Authenticated users can insert prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Authenticated users can update prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Authenticated users can delete prescriptions" ON prescriptions;

-- Legacy ordonnances table
ALTER TABLE ordonnances DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctors can view their ordonnances" ON ordonnances;
DROP POLICY IF EXISTS "Doctors can create ordonnances" ON ordonnances;
DROP POLICY IF EXISTS "Doctors can update their ordonnances" ON ordonnances;
DROP POLICY IF EXISTS "Doctors can delete their ordonnances" ON ordonnances;
DROP POLICY IF EXISTS "Authenticated users can view ordonnances" ON ordonnances;
DROP POLICY IF EXISTS "Authenticated users can insert ordonnances" ON ordonnances;
DROP POLICY IF EXISTS "Authenticated users can update ordonnances" ON ordonnances;
DROP POLICY IF EXISTS "Authenticated users can delete ordonnances" ON ordonnances;

-- Reference data tables (safe to leave open for reading)
ALTER TABLE medications DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view medications" ON medications;
DROP POLICY IF EXISTS "Admins can manage medications" ON medications;
DROP POLICY IF EXISTS "Authenticated users can insert medications" ON medications;

ALTER TABLE drug_interactions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view drug interactions" ON drug_interactions;
DROP POLICY IF EXISTS "Admins can manage drug interactions" ON drug_interactions;
DROP POLICY IF EXISTS "Authenticated users can insert drug interactions" ON drug_interactions;

-- Logging tables
ALTER TABLE interaction_logs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctors can view logs for their patients" ON interaction_logs;
DROP POLICY IF EXISTS "Doctors can create logs for their patients" ON interaction_logs;
DROP POLICY IF EXISTS "Authenticated users can view interaction logs" ON interaction_logs;
DROP POLICY IF EXISTS "Authenticated users can insert interaction logs" ON interaction_logs;

ALTER TABLE doctor_performance DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctors can view their own performance" ON doctor_performance;
DROP POLICY IF EXISTS "Admins can manage doctor performance" ON doctor_performance;
DROP POLICY IF EXISTS "Authenticated users can view doctor performance" ON doctor_performance;
DROP POLICY IF EXISTS "Authenticated users can insert doctor performance" ON doctor_performance;

-- Standalone doctors table (not linked to auth)
ALTER TABLE doctors DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctors can view all doctor profiles" ON doctors;
DROP POLICY IF EXISTS "Doctors can create their own profile" ON doctors;
DROP POLICY IF EXISTS "Doctors can update their own profile" ON doctors;
DROP POLICY IF EXISTS "Doctors can delete their own profile" ON doctors;
DROP POLICY IF EXISTS "Authenticated users can view doctors" ON doctors;
DROP POLICY IF EXISTS "Authenticated users can insert doctors" ON doctors;
DROP POLICY IF EXISTS "Authenticated users can update doctors" ON doctors;
DROP POLICY IF EXISTS "Authenticated users can delete doctors" ON doctors;

-- ============================================================================
-- UPDATE TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'LEGACY TABLE - RLS DISABLED: Uses custom authentication. Data access controlled at application layer. MIGRATION NEEDED: Convert to Supabase Auth and re-enable RLS.';
COMMENT ON TABLE patients IS 'LEGACY TABLE - RLS DISABLED: References legacy users table. MIGRATION NEEDED: Link to doctor_profiles via user_id and re-enable RLS.';
COMMENT ON TABLE doctors IS 'LEGACY TABLE - RLS DISABLED: Standalone table not linked to auth. MIGRATION NEEDED: Merge with doctor_profiles or create FK to auth.users.';
COMMENT ON TABLE ordonnances IS 'LEGACY TABLE - RLS DISABLED: References legacy users table. MIGRATION NEEDED: Link to doctor_profiles and re-enable RLS.';
COMMENT ON TABLE consultations IS 'LEGACY TABLE - RLS DISABLED: Part of legacy system. MIGRATION NEEDED: Link to new auth system and re-enable RLS.';
COMMENT ON TABLE prescriptions IS 'LEGACY TABLE - RLS DISABLED: Part of legacy system. MIGRATION NEEDED: Link to new auth system and re-enable RLS.';
COMMENT ON TABLE interaction_logs IS 'LEGACY TABLE - RLS DISABLED: References legacy users table. MIGRATION NEEDED: Link to new auth system and re-enable RLS.';
COMMENT ON TABLE doctor_performance IS 'LEGACY TABLE - RLS DISABLED: References legacy users table. MIGRATION NEEDED: Link to new auth system and re-enable RLS.';
COMMENT ON TABLE medications IS 'REFERENCE DATA - RLS DISABLED: Public reference data for medications. Safe for all authenticated users to read.';
COMMENT ON TABLE drug_interactions IS 'REFERENCE DATA - RLS DISABLED: Public reference data for drug interactions. Safe for all authenticated users to read.';

-- ============================================================================
-- DOCUMENT MIGRATION PATH
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'RLS DISABLED ON LEGACY TABLES';
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'SECURITY WARNING: The following tables now have RLS disabled:';
  RAISE NOTICE '  - users, patients, doctors, consultations, prescriptions';
  RAISE NOTICE '  - ordonnances, medications, drug_interactions';
  RAISE NOTICE '  - interaction_logs, doctor_performance';
  RAISE NOTICE '';
  RAISE NOTICE 'This means ALL authenticated users can access ALL data in these tables!';
  RAISE NOTICE '';
  RAISE NOTICE 'RECOMMENDED MIGRATION STEPS:';
  RAISE NOTICE '1. Create a mapping table linking auth.users.id to legacy users.id';
  RAISE NOTICE '2. Migrate all legacy user data to user_profiles/doctor_profiles';
  RAISE NOTICE '3. Update FK constraints to reference user_profiles instead of users';
  RAISE NOTICE '4. Re-enable RLS with proper policies using auth.uid()';
  RAISE NOTICE '5. Drop legacy users table once migration is complete';
  RAISE NOTICE '=======================================================================';
END $$;
