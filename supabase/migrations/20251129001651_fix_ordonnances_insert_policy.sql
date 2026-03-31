/*
  # Fix Ordonnances Insert Policy
  
  1. Changes
    - Drop existing restrictive INSERT policy
    - Create new permissive INSERT policy
    - Allow any authenticated user to insert ordonnances
    - No restriction on doctor_id for INSERT (checked on UPDATE/DELETE)
  
  2. Security
    - Still requires authentication
    - Doctors can only modify their own ordonnances
    - All authenticated users can read all ordonnances
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated doctors can create ordonnances" ON ordonnances;

-- Create a more permissive INSERT policy
CREATE POLICY "Authenticated users can create ordonnances"
  ON ordonnances
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
