-- ============================================================
-- MIGRATION 2026-04-07 — Ajout champ pays + PPV marocain aux médicaments
-- ============================================================

-- Ajouter la colonne pays (MA = Maroc, FR = France BDPM)
ALTER TABLE medicaments ADD COLUMN IF NOT EXISTS pays text DEFAULT 'FR';

-- Ajouter le PPV marocain (Prix Public de Vente en MAD)
ALTER TABLE medicaments ADD COLUMN IF NOT EXISTS ppv_ma numeric(8,2);

-- Mettre à jour tous les médicaments existants (BDPM) en FR
UPDATE medicaments SET pays = 'FR' WHERE pays IS NULL;

-- Index pour accélérer le tri pays dans la recherche
CREATE INDEX IF NOT EXISTS idx_medicaments_pays ON medicaments(pays);

-- Contraindre les valeurs valides
ALTER TABLE medicaments ADD CONSTRAINT IF NOT EXISTS medicaments_pays_check
  CHECK (pays IN ('FR', 'MA'));

DO $$ BEGIN
  RAISE NOTICE '✓ Colonnes pays et ppv_ma ajoutées à medicaments';
END $$;
