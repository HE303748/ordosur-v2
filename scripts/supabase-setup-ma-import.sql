-- Étape 1 : Run migration 20260407000001 first (adds pays + ppv_ma columns)
-- Already in: supabase/migrations/20260407000001_add_pays_ppv_to_medicaments.sql

-- Étape 2 : Politique temporaire pour permettre l'import via anon key
-- À supprimer après l'import !
CREATE POLICY "medicaments_anon_import_tmp" ON medicaments
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Étape 3 : Après l'import, supprimer la politique temporaire
-- DROP POLICY "medicaments_anon_import_tmp" ON medicaments;
