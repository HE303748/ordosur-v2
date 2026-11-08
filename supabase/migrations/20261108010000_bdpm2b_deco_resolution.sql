-- ============================================================
-- BDPM-2b DECO résolution — staging uniquement
-- Lot 1 : 4 nouveaux ingrédients + 6 nouvelles classes
-- Lot 2 : résolution substances (C01-C20)
-- Lot 3 : résolution classes (D01-D28) + écarté (E01) + non-résolvables annotés (F01-F14)
-- Résultat final : 1591 auto, 27 écarté, 24 non_resolu annotés (sur 182 initiaux)
-- Note : toutes les opérations ont été appliquées via execute_sql (staging seulement).
-- Cette migration enregistre la traçabilité des données de référence créées.
-- ============================================================

-- ============================================================
-- LOT 1 — NOUVEAUX INGRÉDIENTS
-- ============================================================

INSERT INTO ingredients (id, name_en, synonyms_fr) VALUES
  ('c1e2f3a4-b5c6-d7e8-f9a0-b1c2d3e4f5a6', 'ebastine',    ARRAY['ébastine','ebastine']::text[]),
  ('d2f3a4b5-c6d7-e8f9-a0b1-c2d3e4f5a6b7', 'senna',       ARRAY['séné','senna']::text[]),
  ('e3a4b5c6-d7e8-f9a0-b1c2-d3e4f5a6b7c8', 'benzbromarone',ARRAY['benzbromarone']::text[]),
  ('f4b5c6d7-e8f9-a0b1-c2d3-e4f5a6b7c8d9', 'dextran 40',  ARRAY['dextran 40','dextran-40']::text[])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- LOT 1 — NOUVELLES CLASSES (6 créées d'après les RCP BDPM)
-- ============================================================

INSERT INTO ansm_classe_membres (classe, substance) VALUES
  -- laxatifs stimulants
  ('laxatifs stimulants', 'bisacodyl'),
  ('laxatifs stimulants', 'picosulfate de sodium'),
  ('laxatifs stimulants', 'cascara'),
  ('laxatifs stimulants', 'séné'),
  ('laxatifs stimulants', 'huile de ricin'),
  -- polymyxines (voie parenterale)
  ('polymyxines (voie parenterale)', 'colistine'),
  ('polymyxines (voie parenterale)', 'polymyxine b'),
  -- antiarythmiques classe i
  ('antiarythmiques classe i', 'quinidine'),
  ('antiarythmiques classe i', 'hydroquinidine'),
  ('antiarythmiques classe i', 'disopyramide'),
  ('antiarythmiques classe i', 'mexilétine'),
  ('antiarythmiques classe i', 'lidocaïne'),
  ('antiarythmiques classe i', 'propafénone'),
  ('antiarythmiques classe i', 'cibenzoline'),
  ('antiarythmiques classe i', 'flécaïnide'),
  -- antagonistes calciques non dihydropyridiniques
  ('antagonistes calciques non dihydropyridiniques', 'vérapamil'),
  ('antagonistes calciques non dihydropyridiniques', 'diltiazem'),
  ('antagonistes calciques non dihydropyridiniques', 'bépridil'),
  -- uricosuriques
  ('uricosuriques', 'benzbromarone'),
  ('uricosuriques', 'probénécide'),
  -- antidepresseurs noradrenergiques et serotoninergiques (irsna)
  ('antidepresseurs noradrenergiques et serotoninergiques (irsna)', 'milnacipran'),
  ('antidepresseurs noradrenergiques et serotoninergiques (irsna)', 'venlafaxine')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN — staging uniquement ; ⛔ STOP avant interactions_rcp
-- ============================================================
