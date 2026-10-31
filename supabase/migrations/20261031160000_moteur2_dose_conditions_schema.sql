-- MOTEUR-2 Partie 1a : colonnes dose_cible et conditions_dose sur ansm_regles
-- conditions_dose : tableau JSON de seuils {seuil_mg, niveau} trié par seuil DESC
-- dose_cible : 'entite_a' | 'entite_b' — médicament dont on compare le dosage

ALTER TABLE ansm_regles
  ADD COLUMN IF NOT EXISTS conditions_dose JSONB,
  ADD COLUMN IF NOT EXISTS dose_cible TEXT CHECK (dose_cible IN ('entite_a','entite_b'));
