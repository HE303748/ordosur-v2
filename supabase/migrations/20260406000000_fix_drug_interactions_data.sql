-- ============================================================
-- MIGRATION 2026-04-06 — Correction données interactions P1 bug fix
-- ============================================================

-- 1. Ajout de l'interaction metformine + ibuprofène (manquante)
INSERT INTO drug_interactions (dci_1_pattern, dci_2_pattern, severite, description)
SELECT 'metformine', 'ibuprofène', 'contre_indication',
       'Contre-indication : les AINS (ibuprofène) peuvent provoquer une insuffisance rénale aiguë. En cas d''atteinte rénale, la metformine s''accumule et expose à un risque d''acidose lactique potentiellement fatale.'
WHERE NOT EXISTS (
  SELECT 1 FROM drug_interactions
  WHERE (dci_1_pattern = 'metformine' AND dci_2_pattern = 'ibuprofène')
     OR (dci_1_pattern = 'ibuprofène' AND dci_2_pattern = 'metformine')
);

-- 2. Metformine + Insuffisance rénale chronique: absolue → relative
-- (pour afficher 🟠 ATTENTION et non 🔴 DANGER, la CI absolue s'applique seulement si DFG < 30)
UPDATE contraindications
SET severite = 'relative',
    description = 'Précaution d''emploi : la metformine est contre-indiquée si DFG < 30 mL/min. En cas d''insuffisance rénale chronique modérée, surveiller la fonction rénale et adapter la dose. Risque d''acidose lactique.'
WHERE dci_pattern = 'metformine'
  AND condition_valeur = 'Insuffisance rénale chronique';

DO $$ BEGIN RAISE NOTICE '✓ Données interactions médicamenteuses corrigées'; END $$;
