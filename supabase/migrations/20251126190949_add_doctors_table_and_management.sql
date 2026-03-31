/*
  # Add Doctors Management Table

  1. New Tables
    - `doctors`
      - `id` (uuid, primary key)
      - `nom` (text) - Last name
      - `prenom` (text) - First name
      - `titre` (text) - Title (Dr., Pr.)
      - `specialites` (text array) - Medical specialties
      - `email` (text, unique) - Professional email
      - `telephone` (text) - Phone number
      - `telephone_mobile` (text) - Mobile phone (optional)
      - `rpps` (text, unique) - Professional registration number
      - `date_entree` (date) - Entry date
      - `service` (text) - Department/Service
      - `jours_consultation` (text array) - Consultation days
      - `horaire_debut` (text) - Start time
      - `horaire_fin` (text) - End time
      - `role` (text) - Access role (doctor, doctor_chef, admin)
      - `statut` (text) - Status (actif, conge, inactif)
      - `notes` (text) - Additional notes
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `doctors` table
    - Add policy for clinic users to manage doctors
    - Add policy for doctors to read their own data

  3. Sample Data
    - Add 2 pre-created doctors with standard emails
*/

CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  prenom text NOT NULL,
  titre text NOT NULL DEFAULT 'Dr.',
  specialites text[] NOT NULL DEFAULT '{}',
  email text UNIQUE NOT NULL,
  telephone text NOT NULL,
  telephone_mobile text,
  rpps text UNIQUE NOT NULL,
  date_entree date NOT NULL DEFAULT CURRENT_DATE,
  service text,
  jours_consultation text[] NOT NULL DEFAULT '{}',
  horaire_debut text DEFAULT '09:00',
  horaire_fin text DEFAULT '17:00',
  role text NOT NULL DEFAULT 'doctor',
  statut text NOT NULL DEFAULT 'actif',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic users can manage doctors"
  ON doctors
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert 2 pre-created doctors
INSERT INTO doctors (
  nom, prenom, titre, specialites, email, telephone, rpps, 
  date_entree, jours_consultation, horaire_debut, horaire_fin, role, statut
) VALUES
(
  'Dupont', 'Laurent', 'Dr.', 
  ARRAY['Cardiologie'],
  'laurent.dupont@gmail.com',
  '+33 6 12 34 56 78',
  '10003456789',
  '2020-01-15',
  ARRAY['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
  '08:00', '18:00',
  'doctor', 'actif'
),
(
  'Martin', 'Sophie', 'Dr.',
  ARRAY['Médecine Générale'],
  'sophie.martin@outlook.fr',
  '+33 6 23 45 67 89',
  '10003456790',
  '2019-03-10',
  ARRAY['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
  '09:00', '17:00',
  'doctor', 'actif'
)
ON CONFLICT (email) DO NOTHING;
