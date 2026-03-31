/*
  # Add Missing Columns to Doctors Table

  1. Changes
    - Add `horaire_debut` (time) - Start time for consultation hours
    - Add `horaire_fin` (time) - End time for consultation hours
    - Add `jours_consultation` (text[]) - Array of consultation days
    - Add `service_departement` (text) - Service/department name
    - Add `telephone_mobile` (text) - Mobile phone number

  2. Notes
    - All columns are nullable as they are optional information
    - Uses IF NOT EXISTS to safely add columns
    - Time columns use PostgreSQL time type for consultation hours
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doctors' AND column_name = 'horaire_debut'
  ) THEN
    ALTER TABLE public.doctors ADD COLUMN horaire_debut time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doctors' AND column_name = 'horaire_fin'
  ) THEN
    ALTER TABLE public.doctors ADD COLUMN horaire_fin time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doctors' AND column_name = 'jours_consultation'
  ) THEN
    ALTER TABLE public.doctors ADD COLUMN jours_consultation text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doctors' AND column_name = 'service_departement'
  ) THEN
    ALTER TABLE public.doctors ADD COLUMN service_departement text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doctors' AND column_name = 'telephone_mobile'
  ) THEN
    ALTER TABLE public.doctors ADD COLUMN telephone_mobile text;
  END IF;
END $$;
