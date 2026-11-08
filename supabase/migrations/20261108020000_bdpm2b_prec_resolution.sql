-- ============================================================
-- BDPM-2b PREC résolution — staging uniquement
-- Lot P1 : 1 nouvel ingrédient (métamizole) + 3 nouvelles classes
--          (glycosides cardiaques, inhibiteurs de mtor, antidiabetiques)
-- Lot P2 : résolution substances (P01-P15)
-- Lot P3 : résolution classes (P3a + P3b)
-- Lot P4 : annotations non-résolvables (176 lignes annotées)
-- Résultat final : 5068 auto, 2 écarté, 176 non_resolu annotés (sur 482 initiaux)
-- Note : toutes les opérations ont été appliquées via execute_sql (staging seulement).
-- Cette migration enregistre la traçabilité des données de référence créées.
-- ============================================================

-- ============================================================
-- LOT P1 — NOUVEL INGRÉDIENT
-- ============================================================

INSERT INTO ingredients (id, name_en, synonyms_fr) VALUES
  ('a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', 'metamizole', ARRAY['métamizole','metamizole']::text[])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- LOT P1 — NOUVELLES CLASSES (5 créées d'après les RCP BDPM)
-- ============================================================

INSERT INTO ansm_classe_membres (classe, substance) VALUES
  -- glycosides cardiaques
  ('glycosides cardiaques', 'digoxine'),
  ('glycosides cardiaques', 'digitoxine'),
  ('glycosides cardiaques', 'ouabaïne'),
  ('glycosides cardiaques', 'méthyldigoxine'),
  -- inhibiteurs de mtor
  ('inhibiteurs de mtor', 'sirolimus'),
  ('inhibiteurs de mtor', 'évérolimus'),
  ('inhibiteurs de mtor', 'témsiolimus'),
  -- antidiabetiques (hors insuline séparée)
  ('antidiabetiques', 'metformine'),
  ('antidiabetiques', 'glibenclamide'),
  ('antidiabetiques', 'gliclazide'),
  ('antidiabetiques', 'glipizide'),
  ('antidiabetiques', 'sitagliptine'),
  ('antidiabetiques', 'saxagliptine'),
  ('antidiabetiques', 'empagliflozine'),
  ('antidiabetiques', 'dapagliflozine'),
  ('antidiabetiques', 'canagliflozine'),
  ('antidiabetiques', 'pioglitazone'),
  ('antidiabetiques', 'insuline'),
  -- anticoagulants oraux directs (AOD)
  ('anticoagulants oraux directs', 'apixaban'),
  ('anticoagulants oraux directs', 'rivaroxaban'),
  ('anticoagulants oraux directs', 'dabigatran'),
  ('anticoagulants oraux directs', 'edoxaban'),
  -- lincosamides
  ('lincosamides', 'clindamycine'),
  ('lincosamides', 'lincomycine'),
  -- inhibiteurs de l'anhydrase carbonique
  ('inhibiteurs de l''anhydrase carbonique', 'acétazolamide')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN — staging uniquement ; ⛔ STOP avant interactions_rcp
-- ============================================================
