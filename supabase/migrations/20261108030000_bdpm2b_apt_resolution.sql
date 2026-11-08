-- ============================================================
-- BDPM-2b APT résolution — staging uniquement
-- Lot A1 : résolution substances directes
-- Lot B1 : 5 nouvelles classes créées d'après les RCP BDPM
--          (gabapentinoides, beta-bloquants, antituberculeux,
--           derives azoles antifongiques, prokinetiques)
-- Lot B2+B3 : résolution classes (28 nouvelles lignes ansm_classe_membres)
-- Lot B4 : écartés (34 lignes statut=écarté)
-- Lot B5 : annotations non-résolvables (44 lignes annotées)
-- Résultat final : 3033 auto, 34 écarté, 44 non_resolu annotés (sur 251 initiaux)
-- Note : toutes les opérations ont été appliquées via execute_sql (staging seulement).
-- Cette migration enregistre la traçabilité des données de référence créées.
-- ============================================================

-- ============================================================
-- LOT B1 — NOUVELLES CLASSES (5 créées d'après les RCP BDPM)
-- ============================================================

INSERT INTO ansm_classe_membres (classe, substance) VALUES
  -- gabapentinoides (anticonvulsivants du groupe)
  ('gabapentinoides', 'gabapentin'),
  ('gabapentinoides', 'pregabalin'),
  -- beta-bloquants (liste ANSM)
  ('beta-bloquants', 'propranolol'),
  ('beta-bloquants', 'atenolol'),
  ('beta-bloquants', 'metoprolol'),
  ('beta-bloquants', 'bisoprolol'),
  ('beta-bloquants', 'nebivolol'),
  ('beta-bloquants', 'carvedilol'),
  ('beta-bloquants', 'labetalol'),
  ('beta-bloquants', 'acebutolol'),
  ('beta-bloquants', 'celiprolol'),
  ('beta-bloquants', 'pindolol'),
  ('beta-bloquants', 'timolol'),
  ('beta-bloquants', 'esmolol'),
  ('beta-bloquants', 'sotalol'),
  -- antituberculeux (liste ANSM)
  ('antituberculeux', 'rifampicin'),
  ('antituberculeux', 'isoniazid'),
  ('antituberculeux', 'ethambutol'),
  ('antituberculeux', 'pyrazinamide'),
  ('antituberculeux', 'rifabutin'),
  -- derives azoles antifongiques
  ('derives azoles antifongiques', 'fluconazole'),
  ('derives azoles antifongiques', 'ketoconazole'),
  ('derives azoles antifongiques', 'itraconazole'),
  ('derives azoles antifongiques', 'voriconazole'),
  ('derives azoles antifongiques', 'posaconazole'),
  -- prokinetiques
  ('prokinetiques', 'metoclopramide'),
  ('prokinetiques', 'domperidone'),
  ('prokinetiques', 'erythromycin')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN — staging uniquement
-- ============================================================
