-- ============================================================
-- MIGRATION 2026-04-05 — Numéro unique sur ordonnances
-- ============================================================

ALTER TABLE ordonnances ADD COLUMN IF NOT EXISTS ordre_number text DEFAULT NULL;

DO $$ BEGIN RAISE NOTICE '✓ Colonne ordre_number ajoutée à ordonnances'; END $$;
