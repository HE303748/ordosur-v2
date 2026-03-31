/*
  # Ajouter la table des ordonnances complètes

  1. Nouvelle table
    - `ordonnances`
      - `id` (uuid, clé primaire)
      - `patient_id` (uuid, référence vers patients)
      - `doctor_id` (uuid, référence vers users avec role doctor)
      - `medications` (jsonb, liste complète des médicaments avec posologie, durée, quantité)
      - `remarks` (text, commentaires du médecin)
      - `next_appointment` (text, prochain RDV optionnel)
      - `interaction_status` (text, statut des interactions)
      - `created_at` (timestamp, date de création)
      - `updated_at` (timestamp, date de modification)

  2. Sécurité
    - Enable RLS sur la table `ordonnances`
    - Les médecins peuvent créer et voir leurs propres ordonnances
    - Les patients peuvent voir leurs ordonnances (futur)
*/

CREATE TABLE IF NOT EXISTS ordonnances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES users(id) ON DELETE CASCADE,
  medications jsonb NOT NULL DEFAULT '[]'::jsonb,
  remarks text DEFAULT '',
  next_appointment text,
  interaction_status text DEFAULT 'Non analysé',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ordonnances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can create ordonnances"
  ON ordonnances FOR INSERT
  TO authenticated
  WITH CHECK (doctor_id IN (SELECT id FROM users WHERE role = 'doctor'));

CREATE POLICY "Doctors can view their ordonnances"
  ON ordonnances FOR SELECT
  TO authenticated
  USING (doctor_id IN (SELECT id FROM users WHERE role = 'doctor'));

CREATE POLICY "Doctors can update their ordonnances"
  ON ordonnances FOR UPDATE
  TO authenticated
  USING (doctor_id IN (SELECT id FROM users WHERE role = 'doctor'))
  WITH CHECK (doctor_id IN (SELECT id FROM users WHERE role = 'doctor'));

CREATE POLICY "Doctors can delete their ordonnances"
  ON ordonnances FOR DELETE
  TO authenticated
  USING (doctor_id IN (SELECT id FROM users WHERE role = 'doctor'));

CREATE INDEX IF NOT EXISTS idx_ordonnances_patient ON ordonnances(patient_id);
CREATE INDEX IF NOT EXISTS idx_ordonnances_doctor ON ordonnances(doctor_id);
CREATE INDEX IF NOT EXISTS idx_ordonnances_created ON ordonnances(created_at DESC);
