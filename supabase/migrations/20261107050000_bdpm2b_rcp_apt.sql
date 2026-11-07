-- BDPM-2b Lot APT : à prendre en compte RCP (14 802 lignes attendues)
-- Source unique : bdpm_interactions_staging, statut='relu', niveau='a_prendre_en_compte'
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
  'a_prendre_en_compte',
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
  AND s.niveau = 'a_prendre_en_compte'
ON CONFLICT (bdpm_ligne) DO NOTHING;
