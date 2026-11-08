-- BDPM-2b-bis — Migration interactions_rcp
-- Source : lignes statut='auto' de bdpm_interactions_staging NON encore dans interactions_rcp
-- Ces lignes proviennent de la résolution des 1 183 non_resolu :
--   CI  : 620 nouvelles lignes (201 résolues + 419 auto existantes)
--   DECO: 1 493 nouvelles lignes
--   PREC: 304 nouvelles lignes
--   APT : 173 nouvelles lignes
-- Total : 2 590 lignes
-- Simulation validée (DO $$...RAISE EXCEPTION$$) : ok=t max=4 (seuil 5) ✅
-- Sprint 2026-11-08

INSERT INTO public.interactions_rcp (
  molecule_cids, molecule_libelle, partenaire_cids, partenaire_classe, partenaire_libelle,
  niveau, condition, citation, description_carte,
  source_origine, source_cis, source_url, source_date,
  statut_relecture, action, bdpm_ligne
)
SELECT
  s.canonical_ids,
  lower(s.composition),
  s.partenaire_canonical_ids,
  s.partenaire_classe,
  lower(coalesce(s.partenaire_classe,
    (SELECT string_agg(i.name_en, ' / ' ORDER BY i.name_en)
     FROM ingredients i WHERE i.id = ANY(s.partenaire_canonical_ids)))),
  CASE s.niveau
    WHEN 'contre-indique'       THEN 'contre_indiquee'
    WHEN 'deconseille'          THEN 'deconseillee'
    WHEN 'precaution'           THEN 'precaution'
    WHEN 'a_prendre_en_compte'  THEN 'a_prendre_en_compte'
  END,
  s.condition,
  s.citation,
  COALESCE(s.phrase, s.citation),
  'RCP ' || s.source,
  s.cis,
  s.url,
  s.date_maj_rcp,
  'a_relire_pharmacien',
  'ajout',
  s.ligne
FROM bdpm_interactions_staging s
WHERE s.statut = 'auto'
  AND NOT EXISTS (SELECT 1 FROM interactions_rcp ir WHERE ir.bdpm_ligne = s.ligne)
ON CONFLICT (bdpm_ligne) DO NOTHING;
