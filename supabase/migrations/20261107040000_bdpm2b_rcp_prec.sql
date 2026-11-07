-- BDPM-2b Lot PREC : précautions d'emploi RCP (3 625 lignes attendues, hors MTX faible dose appariées)
-- MTX faible dose (≤ 20 mg/sem) appariée à une ligne DECO/CI haute dose → EXCLUE (fusion dans lot DECO/CI)
-- Source unique : bdpm_interactions_staging, statut='relu', niveau='precaution'
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
  'precaution',
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
  NULL::jsonb,
  NULL::text
FROM bdpm_interactions_staging s
WHERE s.statut = 'relu'
  AND s.niveau = 'precaution'
  -- Exclure les lignes MTX faible dose appariées à une ligne DECO/CI haute dose
  AND NOT (
    s.condition ~* 'méthotrexate.{0,60}(faible|inférieure|≤)'
    AND EXISTS (
      SELECT 1 FROM bdpm_interactions_staging mh
      WHERE mh.canonical_ids = s.canonical_ids
        AND mh.partenaire_canonical_ids = s.partenaire_canonical_ids
        AND mh.cis = s.cis AND mh.statut = 'relu'
        AND mh.condition ~* 'méthotrexate.{0,80}(supérieure|>.{0,5}20)'
        AND mh.niveau IN ('deconseille', 'contre-indique')
    )
  )
ON CONFLICT (bdpm_ligne) DO NOTHING;
