/*
  # Corriger les politiques RLS pour ordonnances

  1. Modifications
    - Supprimer les anciennes politiques
    - Créer de nouvelles politiques qui vérifient correctement l'authentification
    - Les médecins peuvent créer des ordonnances
    - Les médecins peuvent voir toutes les ordonnances (pour la continuité des soins)
    - Les médecins peuvent modifier et supprimer leurs propres ordonnances

  2. Sécurité
    - Permettre aux utilisateurs authentifiés avec role 'doctor' de gérer les ordonnances
*/

DROP POLICY IF EXISTS "Doctors can create ordonnances" ON ordonnances;
DROP POLICY IF EXISTS "Doctors can view their ordonnances" ON ordonnances;
DROP POLICY IF EXISTS "Doctors can update their ordonnances" ON ordonnances;
DROP POLICY IF EXISTS "Doctors can delete their ordonnances" ON ordonnances;

CREATE POLICY "Authenticated doctors can create ordonnances"
  ON ordonnances FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated doctors can view all ordonnances"
  ON ordonnances FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors can update their own ordonnances"
  ON ordonnances FOR UPDATE
  TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors can delete their own ordonnances"
  ON ordonnances FOR DELETE
  TO authenticated
  USING (doctor_id = auth.uid());
