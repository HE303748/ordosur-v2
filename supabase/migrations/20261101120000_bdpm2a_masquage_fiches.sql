-- BDPM-2a Partie 1 — Masquage réversible de 9 fiches contradictoires
-- Sprint BDPM-2a, 2026-10-28
--
-- Certaines entrées de la table medicaments ont une DCI fausse (incohérence
-- détectée par comparaison_complete.csv lors du lot F/G de BDPM-1). Plutôt
-- que de les supprimer, on les masque de façon réversible : elles restent
-- en base mais sont exclues de toutes les recherches.
--
-- Colonnes ajoutées :
--   masque         boolean NOT NULL DEFAULT false
--   motif_masquage text (raison du masquage)
--
-- Les deux RPCs search_medicaments et search_medicaments_hors_maroc filtrent
-- déjà (masque IS NULL OR masque = false) — elles ont été mises à jour en
-- même temps que les colonnes.
--
-- Fiches masquées (9 lignes, par UPDATE ciblé sur l'id exact) :
--
--   e4e67a49  ANDROCUR COMPRIME EFFERVESCENT à 1 G    DCI erronée : PARACETAMOL vs CYPROTÉRONE
--   61ad238c  ESPERAL 100 MG                          DCI erronée : QUETIAPINE vs DISULFIRAME
--   38271b7c  ESPERAL 200 MG                          DCI erronée : QUETIAPINE vs DISULFIRAME
--   8d8794cc  ESPERAL 25 MG                           DCI erronée : QUETIAPINE vs DISULFIRAME
--   f045c1b9  ESPERAL 300 MG                          DCI erronée : QUETIAPINE vs DISULFIRAME
--   ca8625d8  FUCIDINE CREME 2 % tube 15 g            DCI erronée : GRISEOFULVINE vs ACIDE FUSIDIQUE
--   bcf7c203  KEPPRA POUDRE POUR SOLUTION             DCI erronée : CEFOTAXIME vs LEVETIRACETAM
--   9a1a1473  LOCAPRED BUVABLE 100 MG                 DCI erronée : ACETYLSALICYLIQUE vs DÉSONIDE
--   41e62c2b  LOCAPRED POUDRE POUR SOLUTION           DCI illisible : « ACIDE » seul (tronqué)
--
-- Empreinte de contrôle :
--   SELECT count(*) FROM medicaments WHERE masque = true;  → 9

-- ── 1. Colonnes ────────────────────────────────────────────────────────────
ALTER TABLE medicaments
  ADD COLUMN IF NOT EXISTS masque         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motif_masquage text;

CREATE INDEX IF NOT EXISTS medicaments_masque_idx ON medicaments (masque)
  WHERE masque = true;

-- ── 2. Masquage par id exact ───────────────────────────────────────────────
UPDATE medicaments SET masque = true, motif_masquage = 'DCI erronée : PARACETAMOL au lieu de CYPROTÉRONE (ACÉTATE DE) — contradiction BDPM-2a lot F'
WHERE id = 'e4e67a49-1170-44a7-9b11-5bdb49367bd9';

UPDATE medicaments SET masque = true, motif_masquage = 'DCI erronée : QUETIAPINE au lieu de DISULFIRAME — contradiction BDPM-2a lot F'
WHERE id = '61ad238c-5a0e-46ef-8b3d-40f8d33f6064';

UPDATE medicaments SET masque = true, motif_masquage = 'DCI erronée : QUETIAPINE au lieu de DISULFIRAME — contradiction BDPM-2a lot F'
WHERE id = '38271b7c-674f-41e2-879f-daf994818621';

UPDATE medicaments SET masque = true, motif_masquage = 'DCI erronée : QUETIAPINE au lieu de DISULFIRAME — contradiction BDPM-2a lot F'
WHERE id = '8d8794cc-e040-44c1-92ca-96dd50c22991';

UPDATE medicaments SET masque = true, motif_masquage = 'DCI erronée : QUETIAPINE au lieu de DISULFIRAME — contradiction BDPM-2a lot F'
WHERE id = 'f045c1b9-ff85-4481-bb37-9469e4ccd3cc';

UPDATE medicaments SET masque = true, motif_masquage = 'DCI erronée : GRISEOFULVINE au lieu de ACIDE FUSIDIQUE — contradiction BDPM-2a lot G'
WHERE id = 'ca8625d8-f8a2-4868-936e-80d8170466e4';

UPDATE medicaments SET masque = true, motif_masquage = 'DCI erronée : CEFOTAXIME au lieu de LEVETIRACETAM — contradiction BDPM-2a lot F'
WHERE id = 'bcf7c203-0fd4-4f8a-823d-e69a6fecbd84';

UPDATE medicaments SET masque = true, motif_masquage = 'DCI erronée : ACETYLSALICYLIQUE au lieu de DÉSONIDE — contradiction BDPM-2a lot G'
WHERE id = '9a1a1473-408b-42c4-bbcc-84789b9f7859';

UPDATE medicaments SET masque = true, motif_masquage = 'DCI illisible/incomplète : « ACIDE » seul (tronqué) — contradiction BDPM-2a lot G'
WHERE id = '41e62c2b-3558-44e4-9107-6e68a6757407';

-- ── 3. Les RPCs filtrent déjà masque = false (mis à jour en même temps) ───
-- search_medicaments :       WHERE m.pays = 'MA' AND (m.masque IS NULL OR m.masque = false)
-- search_medicaments_hors_maroc : WHERE m.pays <> 'MA' AND (m.masque IS NULL OR m.masque = false)
