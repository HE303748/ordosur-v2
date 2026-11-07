-- BDPM-2b Lot DECO : interactions déconseillées RCP (2 324 lignes attendues)
-- MTX haute dose (> 20 mg/sem) : lignes bimodales → 1 ligne fusionnée avec conditions_dose
-- La ligne PREC faible dose appariée est EXCLUE du lot PREC (migration suivante)
-- Source unique : bdpm_interactions_staging, statut='relu', niveau='deconseille'
-- Sprint 2026-11-07

INSERT INTO public.interactions_rcp (
  molecule_cids, molecule_libelle, partenaire_cids, partenaire_classe, partenaire_libelle,
  niveau, condition, citation, description_carte,
  source_origine, source_cis, source_url, source_date,
  statut_relecture, action, bdpm_ligne,
  conditions_dose, dose_cible
)
SELECT
  s.canonical_ids,
  lower(s.composition),
  s.partenaire_canonical_ids,
  s.partenaire_classe,
  lower(coalesce(s.partenaire_classe,
    (SELECT string_agg(i.name_en, ' / ' ORDER BY i.name_en)
     FROM ingredients i WHERE i.id = ANY(s.partenaire_canonical_ids)))),
  'deconseillee',
  s.condition,
  s.citation,
  COALESCE(s.phrase, s.citation),
  'RCP ' || s.source,
  s.cis,
  s.url,
  s.date_maj_rcp,
  'a_relire_pharmacien',
  'ajout',
  s.ligne,
  CASE
    WHEN s.condition ~* 'méthotrexate.{0,80}(supérieure|>.{0,5}20)' AND EXISTS (
      SELECT 1 FROM bdpm_interactions_staging ml
      WHERE ml.canonical_ids = s.canonical_ids
        AND ml.partenaire_canonical_ids = s.partenaire_canonical_ids
        AND ml.cis = s.cis AND ml.statut = 'relu'
        AND ml.condition ~* 'méthotrexate.{0,60}(faible|inférieure|≤)'
        AND ml.niveau = 'precaution'
    ) THEN '[{"seuil_mg":20,"niveau":"deconseillee"},{"seuil_mg":0,"niveau":"precaution"}]'::jsonb
    WHEN s.condition ~* 'méthotrexate.{0,80}(supérieure|>.{0,5}20)'
    THEN '[{"seuil_mg":20,"niveau":"deconseillee"}]'::jsonb
    ELSE NULL
  END,
  CASE
    WHEN s.condition ~* 'méthotrexate.{0,80}(supérieure|>.{0,5}20)' THEN 'partenaire'
    ELSE NULL
  END
FROM bdpm_interactions_staging s
WHERE s.statut = 'relu'
  AND s.niveau = 'deconseille'
ON CONFLICT (bdpm_ligne) DO NOTHING;
