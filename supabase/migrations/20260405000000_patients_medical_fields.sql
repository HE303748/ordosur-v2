-- ============================================================
-- MIGRATION 2026-04-05 — Fiche patient enrichie (Priorité 2)
-- Ajout des champs médicaux sur la table patients
-- ============================================================

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS pathologies            text[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allergies_medicaments  text[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allergies_alimentaires text[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS groupe_sanguin         text     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS antecedents_chirurgicaux text   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS traitements_en_cours   text     DEFAULT NULL;

DO $$ BEGIN RAISE NOTICE '✓ Champs médicaux ajoutés à la table patients'; END $$;
