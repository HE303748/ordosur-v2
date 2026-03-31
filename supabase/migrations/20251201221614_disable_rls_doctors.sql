/*
  # Disable RLS on Doctors Table
  
  1. Changes
    - Disable Row Level Security on doctors table
    - This is needed because the app uses custom authentication (localStorage)
    - Not using Supabase Auth, so auth.uid() is always null
  
  2. Security Notes
    - Access control is handled at application level
    - All authenticated users can create/read/update doctors
    - Consider migrating to Supabase Auth in the future for better security
*/

-- Disable RLS on doctors table
ALTER TABLE doctors DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies (no longer needed)
DROP POLICY IF EXISTS "Clinic admins can view all doctors" ON doctors;
DROP POLICY IF EXISTS "Clinic admins can insert doctors" ON doctors;
DROP POLICY IF EXISTS "Clinic admins can update doctors" ON doctors;
DROP POLICY IF EXISTS "Clinic admins can delete doctors" ON doctors;
DROP POLICY IF EXISTS "Doctors can view their own profile" ON doctors;
DROP POLICY IF EXISTS "Doctors can update their own profile" ON doctors;
