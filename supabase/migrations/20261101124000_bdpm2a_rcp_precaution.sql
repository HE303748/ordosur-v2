-- BDPM-2a Partie 2 — Chargement des interactions RCP précaution / à prendre en compte
-- Sprint BDPM-2a, 2026-10-29
--
-- 1. Élargit la contrainte niveau de interactions_rcp pour accepter les deux nouveaux niveaux.
-- 2. Insère 8 099 lignes depuis bdpm_interactions_staging (précaution : 5 158, à prendre
--    en compte : 2 941) — statut auto ou relu. ON CONFLICT (bdpm_ligne) DO NOTHING.
-- 3. Met à jour check_interactions_v2 : rang et sévérité RCP mappés correctement pour
--    precaution (rang 3 / moderee) et a_prendre_en_compte (rang 2 / mineure).
--
-- Contrôles attendus (après application) :
--   SELECT niveau, count(*) FROM interactions_rcp GROUP BY niveau ORDER BY niveau;
--   → a_prendre_en_compte : 2 941, precaution : 5 158, contre_indiquee / deconseillee : existants
--
--   SELECT r->'interactions' FROM (SELECT check_interactions_v2(ARRAY[
--     '99a86d2c-fba5-446c-83fd-212ba1d1013d'::uuid,   -- SINTROM 4
--     '8f39d601-0000-0000-0000-000000000000'::uuid    -- AUGMENTIN 1G (remplacer par id réel)
--   ]) AS r) x;
--   → 1 carte, severite=mineure, source=RCP, niveau= a_prendre_en_compte (si la ligne existe)

-- ── 1. Contrainte niveau ──────────────────────────────────────────────────────────────────
ALTER TABLE interactions_rcp
  DROP CONSTRAINT interactions_rcp_niveau_check;

ALTER TABLE interactions_rcp
  ADD CONSTRAINT interactions_rcp_niveau_check
    CHECK (niveau = ANY (ARRAY[
      'contre_indiquee'::text,
      'deconseillee'::text,
      'precaution'::text,
      'a_prendre_en_compte'::text
    ]));

-- ── 2. Insertion des 8 099 lignes ────────────────────────────────────────────────────────
INSERT INTO interactions_rcp (
  molecule_cids,
  molecule_libelle,
  partenaire_cids,
  partenaire_classe,
  partenaire_libelle,
  niveau,
  condition,
  citation,
  description_carte,
  source_origine,
  source_cis,
  source_url,
  source_date,
  statut_relecture,
  action,
  bdpm_ligne
)
SELECT
  s.canonical_ids,
  s.composition,
  s.partenaire_canonical_ids,
  s.partenaire_classe,
  s.partenaire_rcp,
  s.niveau,
  s.condition,
  s.citation,
  COALESCE(s.phrase, s.citation),
  CASE s.source WHEN 'BDPM' THEN 'RCP BDPM' WHEN 'EMA' THEN 'RCP EMA' END,
  s.cis,
  s.url,
  s.date_maj_rcp,
  'a_relire_pharmacien',
  'ajout',
  s.ligne
FROM bdpm_interactions_staging s
WHERE s.niveau IN ('precaution', 'a_prendre_en_compte')
  AND s.statut IN ('auto', 'relu')
ON CONFLICT (bdpm_ligne) DO NOTHING;

-- ── 3. Mise à jour check_interactions_v2 ─────────────────────────────────────────────────
-- Changements par rapport à la version précédente :
--   rcp_hits.rang  : precaution → 3, a_prendre_en_compte → 2  (était ELSE 4)
--   rcp.severite   : precaution → 'moderee', a_prendre_en_compte → 'mineure'  (était ELSE 'majeure')
-- Invariant : une carte RCP n'est émise que si aucune carte ANSM/DDInter de rang ≥ rang RCP n'existe.

CREATE OR REPLACE FUNCTION public.check_interactions_v2(p_med_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_i jsonb; v_nv jsonb; v_ok jsonb;
BEGIN
  WITH med_can AS MATERIALIZED (
    SELECT DISTINCT mi.medicament_id, m.nom, COALESCE(i.canonical_id, i.id) AS cid
    FROM medicament_ingredients mi
    JOIN medicaments m ON m.id = mi.medicament_id
    JOIN ingredients i ON i.id = mi.ingredient_id
    WHERE mi.medicament_id = ANY(p_med_ids)
  ),
  med_x AS MATERIALIZED (
    SELECT mc.medicament_id, mc.nom, mc.cid, c.name_en, g.id AS ingredient_id,
      EXISTS (SELECT 1 FROM medicament_ingredients d
              WHERE d.medicament_id = mc.medicament_id AND d.ingredient_id = g.id) AS direct
    FROM med_can mc
    JOIN ingredients c ON c.id = mc.cid
    CROSS JOIN LATERAL (
      SELECT mc.cid AS id
      UNION
      SELECT x.id FROM ingredients x WHERE x.canonical_id = mc.cid
    ) g
  ),
  ansm AS (
    SELECT DISTINCT ON (a.medicament_id, b.medicament_id)
      a.nom AS nom_a, b.nom AS nom_b, a.name_en AS ing_a, b.name_en AS ing_b,
      CASE r.niveau WHEN 'contre_indiquee' THEN 'majeure'
                    WHEN 'deconseillee' THEN 'majeure'
                    WHEN 'precaution' THEN 'moderee'
                    ELSE 'mineure' END AS severite,
      r.niveau AS niveau_ansm, r.description, 'ANSM'::text AS source,
      a.medicament_id AS ma, b.medicament_id AS mb,
      CASE r.niveau WHEN 'contre_indiquee' THEN 4 WHEN 'deconseillee' THEN 4
                    WHEN 'precaution' THEN 3 ELSE 2 END AS rang
    FROM med_x a
    JOIN med_x b ON a.medicament_id < b.medicament_id AND a.cid <> b.cid
    JOIN v_ingredient_entites ea ON ea.ingredient_id = a.ingredient_id
    JOIN v_ingredient_entites eb ON eb.ingredient_id = b.ingredient_id
    JOIN ansm_regles r
      ON r.entite_a = LEAST(ea.entite, eb.entite) AND r.entite_b = GREATEST(ea.entite, eb.entite)
    ORDER BY a.medicament_id, b.medicament_id,
      CASE r.niveau WHEN 'contre_indiquee' THEN 4 WHEN 'deconseillee' THEN 3
                    WHEN 'precaution' THEN 2 ELSE 1 END DESC,
      r.entite_a, r.entite_b
  ),
  ddi_c AS (
    SELECT DISTINCT ON (a.medicament_id, b.medicament_id, LEAST(a.cid, b.cid), GREATEST(a.cid, b.cid))
      a.nom AS nom_a, b.nom AS nom_b, a.name_en AS ing_a, b.name_en AS ing_b,
      ii.severite, ii.description, a.medicament_id AS ma, b.medicament_id AS mb,
      CASE ii.severite WHEN 'contre_indication' THEN 5 WHEN 'majeure' THEN 4
                       WHEN 'moderee' THEN 3 WHEN 'mineure' THEN 2 ELSE 1 END AS rang
    FROM med_x a
    JOIN med_x b ON a.medicament_id < b.medicament_id AND a.cid <> b.cid
    JOIN interactions_ingredients ii
      ON ii.ingredient_1 = LEAST(a.ingredient_id, b.ingredient_id)
     AND ii.ingredient_2 = GREATEST(a.ingredient_id, b.ingredient_id)
    WHERE ii.exclue_motif IS NULL
      AND (NOT ii.revue_requise OR (a.direct AND b.direct))
    ORDER BY a.medicament_id, b.medicament_id, LEAST(a.cid, b.cid), GREATEST(a.cid, b.cid),
      CASE ii.severite WHEN 'contre_indication' THEN 5 WHEN 'majeure' THEN 4
                       WHEN 'moderee' THEN 3 WHEN 'mineure' THEN 2 ELSE 1 END DESC,
      ii.revue_requise, ii.description
  ),
  ddi AS (
    SELECT d.nom_a, d.nom_b, d.ing_a, d.ing_b, d.severite, NULL::text AS niveau_ansm, d.description,
      'DDInter'::text AS source
    FROM ddi_c d
    WHERE NOT EXISTS (SELECT 1 FROM ansm x WHERE x.ma = d.ma AND x.mb = d.mb AND x.rang >= d.rang)
  ),
  cumul AS (
    SELECT DISTINCT a.nom AS nom_a, b.nom AS nom_b, a.name_en AS ing_a, b.name_en AS ing_b,
      'majeure'::text AS severite, 'cumul_classe'::text AS niveau_ansm,
      ('Association de deux medicaments de la meme classe a risque (' || ea.entite ||
       '). Cumul d''effets : risque majore. Conduite : verifier l''indication de cette association.')::text AS description,
      'Cumul'::text AS source
    FROM med_x a
    JOIN med_x b ON a.medicament_id < b.medicament_id AND a.cid <> b.cid
    JOIN v_ingredient_entites ea ON ea.ingredient_id = a.ingredient_id
    JOIN v_ingredient_entites eb ON eb.ingredient_id = b.ingredient_id AND eb.entite = ea.entite
    WHERE ea.entite IN ('anticoagulants oraux','antivitamines k','antiagregants plaquettaires',
                        'substances susceptibles de donner des torsades de pointes',
                        'anti-inflammatoires non steroidiens',
                        'inhibiteurs de l''enzyme de conversion',
                        'antagonistes des recepteurs de l''angiotensine ii',
                        'medicaments a l''origine d''un syndrome serotoninergique',
                        'benzodiazepines et apparentes','morphiniques')
      AND NOT EXISTS (SELECT 1 FROM ansm x WHERE x.ma=a.medicament_id AND x.mb=b.medicament_id)
  ),
  -- BDPM-1 G2 — interactions lues dans les RCP (interactions_rcp), à relire par un pharmacien.
  -- BDPM-2a — les niveaux precaution et a_prendre_en_compte sont désormais inclus.
  med_cids AS MATERIALIZED (
    SELECT mc.medicament_id, mc.nom, array_agg(DISTINCT mc.cid) AS cids FROM med_can mc GROUP BY mc.medicament_id, mc.nom
  ),
  rcp_hits AS (
    SELECT r.id, m.medicament_id AS mm, p.medicament_id AS mp, m.nom AS nom_m, p.nom AS nom_p,
      r.molecule_libelle, r.partenaire_libelle, r.niveau, r.description_carte,
      CASE r.niveau WHEN 'contre_indiquee'    THEN 5
                    WHEN 'deconseillee'       THEN 4
                    WHEN 'precaution'         THEN 3
                    WHEN 'a_prendre_en_compte' THEN 2
                    ELSE 4 END AS rang
    FROM interactions_rcp r
    JOIN med_cids m ON m.cids @> r.molecule_cids
    JOIN med_cids p ON p.medicament_id <> m.medicament_id
    WHERE r.exclue_motif IS NULL
      AND ((cardinality(r.partenaire_cids) > 0 AND p.cids && r.partenaire_cids)
        OR (r.partenaire_classe IS NOT NULL AND EXISTS (
              SELECT 1 FROM med_x bx JOIN v_ingredient_entites e ON e.ingredient_id = bx.ingredient_id
              WHERE bx.medicament_id = p.medicament_id AND e.entite = r.partenaire_classe)))
  ),
  rcp AS (
    SELECT DISTINCT ON (LEAST(h.mm, h.mp), GREATEST(h.mm, h.mp))
      CASE WHEN h.mm < h.mp THEN h.nom_m ELSE h.nom_p END AS nom_a,
      CASE WHEN h.mm < h.mp THEN h.nom_p ELSE h.nom_m END AS nom_b,
      CASE WHEN h.mm < h.mp THEN h.molecule_libelle ELSE h.partenaire_libelle END AS ing_a,
      CASE WHEN h.mm < h.mp THEN h.partenaire_libelle ELSE h.molecule_libelle END AS ing_b,
      CASE h.niveau WHEN 'contre_indiquee'    THEN 'contre_indication'
                    WHEN 'deconseillee'       THEN 'majeure'
                    WHEN 'precaution'         THEN 'moderee'
                    WHEN 'a_prendre_en_compte' THEN 'mineure'
                    ELSE 'majeure' END AS severite,
      NULL::text AS niveau_ansm, h.description_carte AS description, 'RCP'::text AS source,
      LEAST(h.mm, h.mp) AS ma, GREATEST(h.mm, h.mp) AS mb, h.rang
    FROM rcp_hits h
    ORDER BY LEAST(h.mm, h.mp), GREATEST(h.mm, h.mp), h.rang DESC, h.id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'medicament_a',nom_a,'medicament_b',nom_b,'ingredient_a',ing_a,'ingredient_b',ing_b,
    'severite',severite,'niveau_ansm',niveau_ansm,'description',description,'source',source)),'[]'::jsonb)
  INTO v_i
  FROM (SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM ansm
        UNION ALL SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM ddi
        UNION ALL SELECT nom_a,nom_b,ing_a,ing_b,severite,niveau_ansm,description,source FROM cumul
        -- Carte RCP seulement si aucune carte ANSM / DDInter de la paire n'est au moins aussi sévère.
        UNION ALL SELECT r.nom_a,r.nom_b,r.ing_a,r.ing_b,r.severite,r.niveau_ansm,r.description,r.source FROM rcp r
          WHERE NOT EXISTS (SELECT 1 FROM ansm x WHERE x.ma = r.ma AND x.mb = r.mb
                              AND CASE x.niveau_ansm WHEN 'contre_indiquee' THEN 5 WHEN 'deconseillee' THEN 4
                                                     WHEN 'precaution' THEN 3 ELSE 2 END >= r.rang)
            AND NOT EXISTS (SELECT 1 FROM ddi_c d WHERE d.ma = r.ma AND d.mb = r.mb AND d.rang >= r.rang)) t;

  SELECT COALESCE(jsonb_agg(m.nom),'[]'::jsonb) INTO v_nv FROM medicaments m
  WHERE m.id = ANY(p_med_ids)
    AND NOT EXISTS (SELECT 1 FROM medicament_ingredients mi WHERE mi.medicament_id=m.id);

  SELECT COALESCE(jsonb_agg(m.nom),'[]'::jsonb) INTO v_ok FROM medicaments m
  WHERE m.id = ANY(p_med_ids)
    AND EXISTS (SELECT 1 FROM medicament_ingredients mi WHERE mi.medicament_id=m.id);

  RETURN jsonb_build_object('interactions',v_i,'medicaments_verifies',v_ok,'medicaments_non_verifiables',v_nv);
END;
$function$;
