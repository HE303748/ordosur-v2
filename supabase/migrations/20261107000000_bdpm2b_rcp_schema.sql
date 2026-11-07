-- BDPM-2b Migration : colonnes conditions_dose et dose_cible sur interactions_rcp
-- Permet le mécanisme MOTEUR-2 (dose gating) sur les lignes RCP lot 4
-- Sprint 2026-11-07

ALTER TABLE public.interactions_rcp
  ADD COLUMN IF NOT EXISTS conditions_dose JSONB,
  ADD COLUMN IF NOT EXISTS dose_cible TEXT CHECK (dose_cible IN ('molecule', 'partenaire'));

COMMENT ON COLUMN public.interactions_rcp.conditions_dose IS
  'Conditions de dose MOTEUR-2 : [{seuil_mg, niveau}] décroissant. NULL = pas de condition.';
COMMENT ON COLUMN public.interactions_rcp.dose_cible IS
  'Entité cible du dosage : molecule (composition) ou partenaire.';
