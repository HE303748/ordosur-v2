/*
  # Add Enhanced Fields to Doctor Profiles

  1. New Columns Added to doctor_profiles
    - `adeli_number` (text) - Numéro ADELI unique identifier
    - `practice_mode` (text) - Mode d'exercice (Libéral, Salarié, Hospitalier, Mixte)
    - `languages` (text array) - Langues parlées par le médecin
    - `biography` (text) - Biographie du médecin (max 500 caractères)
    - `avatar_url` (text) - URL de la photo de profil stockée dans Supabase Storage
  
  2. New Column Added to user_profiles
    - `last_login` (timestamptz) - Dernière connexion de l'utilisateur
  
  3. Notes
    - All new columns are nullable for backward compatibility
    - Languages stored as array for multi-select functionality
    - Avatar URL will point to Supabase Storage bucket
*/

-- Add new columns to doctor_profiles
ALTER TABLE public.doctor_profiles 
ADD COLUMN IF NOT EXISTS adeli_number text,
ADD COLUMN IF NOT EXISTS practice_mode text,
ADD COLUMN IF NOT EXISTS languages text[],
ADD COLUMN IF NOT EXISTS biography text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add last_login to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS last_login timestamptz;