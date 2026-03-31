/*
  # Remove Authentication Requirements

  ## Overview
  This migration removes RLS authentication requirements to allow public access
  since the application no longer uses email/password authentication.

  ## Changes Made
  1. Drop all existing RLS policies that require authentication
  2. Create new public access policies for all tables
  3. Keep RLS enabled for data protection structure

  ## Security Note
  This is appropriate for a demo/development environment. In production,
  proper authentication should be implemented.
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Doctors can view own patients" ON patients;
DROP POLICY IF EXISTS "Doctors can insert own patients" ON patients;
DROP POLICY IF EXISTS "Doctors can update own patients" ON patients;
DROP POLICY IF EXISTS "Doctors can delete own patients" ON patients;
DROP POLICY IF EXISTS "Authenticated users can read medications" ON medications;
DROP POLICY IF EXISTS "Authenticated users can read drug interactions" ON drug_interactions;
DROP POLICY IF EXISTS "Doctors can view own interaction logs" ON interaction_logs;
DROP POLICY IF EXISTS "Clinic users can view all interaction logs" ON interaction_logs;
DROP POLICY IF EXISTS "Doctors can insert own interaction logs" ON interaction_logs;
DROP POLICY IF EXISTS "Doctors can view own performance" ON doctor_performance;
DROP POLICY IF EXISTS "Clinic users can view all doctor performance" ON doctor_performance;

-- Create public access policies

-- Users table - public read/update
CREATE POLICY "Public can read users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Public can update users"
  ON users FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Patients table - public access
CREATE POLICY "Public can read patients"
  ON patients FOR SELECT
  USING (true);

CREATE POLICY "Public can insert patients"
  ON patients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update patients"
  ON patients FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete patients"
  ON patients FOR DELETE
  USING (true);

-- Medications table - public read
CREATE POLICY "Public can read medications"
  ON medications FOR SELECT
  USING (true);

CREATE POLICY "Public can insert medications"
  ON medications FOR INSERT
  WITH CHECK (true);

-- Drug interactions table - public read
CREATE POLICY "Public can read drug interactions"
  ON drug_interactions FOR SELECT
  USING (true);

CREATE POLICY "Public can insert drug interactions"
  ON drug_interactions FOR INSERT
  WITH CHECK (true);

-- Interaction logs table - public access
CREATE POLICY "Public can read interaction logs"
  ON interaction_logs FOR SELECT
  USING (true);

CREATE POLICY "Public can insert interaction logs"
  ON interaction_logs FOR INSERT
  WITH CHECK (true);

-- Doctor performance table - public read
CREATE POLICY "Public can read doctor performance"
  ON doctor_performance FOR SELECT
  USING (true);

CREATE POLICY "Public can insert doctor performance"
  ON doctor_performance FOR INSERT
  WITH CHECK (true);
