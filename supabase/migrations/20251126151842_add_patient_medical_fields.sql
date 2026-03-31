/*
  # Add Medical Fields to Patients Table
  
  ## Changes
  
  This migration adds additional medical fields to the patients table to support
  more comprehensive patient profiles and clinical decision support:
  
  1. New Fields Added:
    - `poids` (decimal) - Patient weight in kg
    - `taille` (integer) - Patient height in cm
    - `creatinine` (decimal) - Serum creatinine in mg/dL for calculating GFR
    - `imc` (decimal, computed) - Body Mass Index calculated from weight/height
    - `dfg` (decimal, computed) - Estimated Glomerular Filtration Rate
  
  2. Clinical Use:
    - IMC helps assess obesity-related medication dosing
    - DFG/Creatinine helps identify renal impairment for medication safety
    - Weight is essential for weight-based dosing calculations
  
  ## Important Notes
  
  - All new fields are nullable to maintain compatibility with existing records
  - IMC and DFG can be calculated in the application layer
  - Default values allow gradual data migration
*/

-- Add new medical fields to patients table
DO $$
BEGIN
  -- Add weight in kg
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'poids'
  ) THEN
    ALTER TABLE patients ADD COLUMN poids decimal(5,1);
  END IF;

  -- Add height in cm
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'taille'
  ) THEN
    ALTER TABLE patients ADD COLUMN taille integer;
  END IF;

  -- Add creatinine in mg/dL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'creatinine'
  ) THEN
    ALTER TABLE patients ADD COLUMN creatinine decimal(4,2);
  END IF;

  -- Add computed IMC (can be calculated: poids / (taille/100)^2)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'imc'
  ) THEN
    ALTER TABLE patients ADD COLUMN imc decimal(4,1);
  END IF;

  -- Add computed DFG (Glomerular Filtration Rate)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'dfg'
  ) THEN
    ALTER TABLE patients ADD COLUMN dfg decimal(5,1);
  END IF;
END $$;

-- Add check constraints for data validation
DO $$
BEGIN
  -- Weight should be reasonable (20-300 kg)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'patients_poids_check'
  ) THEN
    ALTER TABLE patients ADD CONSTRAINT patients_poids_check 
    CHECK (poids IS NULL OR (poids >= 20 AND poids <= 300));
  END IF;

  -- Height should be reasonable (50-250 cm)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'patients_taille_check'
  ) THEN
    ALTER TABLE patients ADD CONSTRAINT patients_taille_check 
    CHECK (taille IS NULL OR (taille >= 50 AND taille <= 250));
  END IF;

  -- Creatinine should be reasonable (0.1-20 mg/dL)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'patients_creatinine_check'
  ) THEN
    ALTER TABLE patients ADD CONSTRAINT patients_creatinine_check 
    CHECK (creatinine IS NULL OR (creatinine >= 0.1 AND creatinine <= 20));
  END IF;
END $$;
