/*
  # Disable RLS on Ordonnances Table
  
  1. Changes
    - Disable Row Level Security on ordonnances table
    - This is needed because the app uses custom authentication (localStorage)
    - Not using Supabase Auth, so auth.uid() is always null
  
  2. Security Notes
    - Access control is handled at application level
    - All authenticated users can create/read ordonnances
    - Consider migrating to Supabase Auth in the future for better security
*/

-- Disable RLS on ordonnances table
ALTER TABLE ordonnances DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies (no longer needed)
DROP POLICY IF EXISTS "Authenticated users can create ordonnances" ON ordonnances;
DROP POLICY IF EXISTS "Authenticated doctors can view all ordonnances" ON ordonnances;
DROP POLICY IF EXISTS "Doctors can update their own ordonnances" ON ordonnances;
DROP POLICY IF EXISTS "Doctors can delete their own ordonnances" ON ordonnances;
