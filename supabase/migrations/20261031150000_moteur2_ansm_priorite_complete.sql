-- MOTEUR-2 Partie 2 : ANSM prime sur DDInter/RCP pour toute paire couverte
-- Exceptions (garde le plus sévère) : cytotoxiques×immunosuppresseurs,
--   inhibiteurs puissants CYP3A4×substrats à risque CYP3A4
-- Rapport : 30 paires dont DDInter > ANSM niveau → niveau ANSM désormais affiché
-- Top 5 (CI vs precaution/deconseillee) : amiodarone×digoxine, amiodarone×simvastatine,
--   AVK×fluconazole, bradycardisants×torsades, thiazidiques×lithium

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
  -- Paires exception : on garde le plus sévère (DDInter si > ANSM, sinon ANSM)
  -- Source : liste fixe dans cette migration
  exceptions AS (
    SELECT DISTINCT a.medicament_id AS ma, b.medicament_id AS mb
    FROM med_x a
    JOIN med_x b ON a.medicament_id < b.medicament_id AND a.cid <> b.cid
    JOIN v_ingredient_entites ea ON ea.ingredient_id = a.ingredient_id
    JOIN v_ingredient_entites eb ON eb.ingredient_id = b.ingredient_id
    WHERE (LEAST(ea.entite, eb.entite) = 'cytotoxiques'
           AND GREATEST(ea.entite, eb.entite) = 'immunosuppresseurs')
       OR (LEAST(ea.entite, eb.entite) = 'inhibiteurs puissants du cyp3a4'
           AND GREATEST(ea.entite, eb.entite) = 'substrats a risque du cyp3a4')
  ),
  ansm AS (
    SELECT DISTINCT ON (a.medicament_id, b.medicament_id)
      a.nom AS nom_a, b.nom AS nom_b, a.name_en AS ing_a, b.name_en AS ing_b,
      CASE r.niveau WHEN 'contre_indiquee' THEN 'contre_indication'
                    WHEN 'deconseillee' THEN 'majeure'
                    WHEN 'precaution' THEN 'moderee'
                    ELSE 'mineure' END AS severite,
      r.niveau AS niveau_ansm, r.description, 'ANSM'::text AS source,
      a.medicament_id AS ma, b.medicament_id AS mb,
      CASE r.niveau WHEN 'contre_indiquee' THEN 5 WHEN 'deconseillee' THEN 4
                    WHEN 'precaution' THEN 3 ELSE 2 END AS rang
    FROM med_x a
    JOIN med_x b ON a.medicament_id < b.medicament_id AND a.cid <> b.cid
    JOIN v_ingredient_entites ea ON ea.ingredient_id = a.ingredient_id
    JOIN v_ingredient_entites eb ON eb.ingredient_id = b.ingredient_id
    JOIN ansm_regles r
      ON r.entite_a = LEAST(ea.entite, eb.entite) AND r.entite_b = GREATEST(ea.entite, eb.entite)
    ORDER BY a.medicament_id, b.medicament_id,
      CASE r.niveau WHEN 'contre_indiquee' THEN 5 WHEN 'deconseillee' THEN 3
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
    WHERE NOT EXISTS (
      SELECT 1 FROM ansm x WHERE x.ma = d.ma AND x.mb = d.mb
      AND (
        -- Paire normale : toute couverture ANSM supprime DDInter
        NOT EXISTS (SELECT 1 FROM exceptions e WHERE e.ma = d.ma AND e.mb = d.mb)
        OR
        -- Paire exception : supprime DDInter seulement si ANSM au moins aussi sévère
        x.rang >= d.rang
      )
    )
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
  ),
  ansm_aussi AS (
    SELECT a.ma, a.mb, string_agg(sigs.s, ' · ' ORDER BY sigs.s) AS aussi_signale
    FROM ansm a
    JOIN LATERAL (
      SELECT 'DDInter : ' ||
        CASE d.severite
          WHEN 'contre_indication' THEN 'contre-indication'
          WHEN 'majeure'           THEN 'majeure'
          WHEN 'moderee'           THEN 'modérée'
          WHEN 'mineure'           THEN 'mineure'
          ELSE d.severite END AS s
      FROM ddi_c d WHERE d.ma = a.ma AND d.mb = a.mb
      UNION
      SELECT 'RCP : ' ||
        CASE h.niveau
          WHEN 'contre_indiquee'    THEN 'contre-indication'
          WHEN 'deconseillee'       THEN 'déconseillée'
          WHEN 'precaution'         THEN 'précaution'
          WHEN 'a_prendre_en_compte' THEN 'à prendre en compte'
          ELSE h.niveau END
      FROM rcp_hits h
      WHERE LEAST(h.mm, h.mp) = a.ma AND GREATEST(h.mm, h.mp) = a.mb
    ) sigs(s) ON true
    GROUP BY a.ma, a.mb
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'medicament_a',nom_a,'medicament_b',nom_b,'ingredient_a',ing_a,'ingredient_b',ing_b,
    'severite',severite,'niveau_ansm',niveau_ansm,'description',description,'source',source,
    'aussi_signale',aussi_signale)),'[]'::jsonb)
  INTO v_i
  FROM (
    SELECT a.nom_a, a.nom_b, a.ing_a, a.ing_b, a.severite, a.niveau_ansm, a.description, a.source,
           aa.aussi_signale
    FROM ansm a LEFT JOIN ansm_aussi aa ON aa.ma = a.ma AND aa.mb = a.mb
    -- Exception : supprime la carte ANSM si DDInter est strictement plus sévère pour cette paire
    WHERE NOT EXISTS (
      SELECT 1 FROM exceptions e
      WHERE e.ma = a.ma AND e.mb = a.mb
        AND EXISTS (SELECT 1 FROM ddi_c d WHERE d.ma = a.ma AND d.mb = a.mb AND d.rang > a.rang)
    )
    UNION ALL
    SELECT nom_a, nom_b, ing_a, ing_b, severite, niveau_ansm, description, source, NULL::text AS aussi_signale
    FROM ddi
    UNION ALL
    SELECT nom_a, nom_b, ing_a, ing_b, severite, niveau_ansm, description, source, NULL::text AS aussi_signale
    FROM cumul
    UNION ALL
    SELECT r.nom_a, r.nom_b, r.ing_a, r.ing_b, r.severite, r.niveau_ansm, r.description, r.source,
           NULL::text AS aussi_signale
    FROM rcp r
    WHERE NOT EXISTS (
        SELECT 1 FROM ansm x WHERE x.ma = r.ma AND x.mb = r.mb
        AND (
          NOT EXISTS (SELECT 1 FROM exceptions e WHERE e.ma = r.ma AND e.mb = r.mb)
          OR CASE x.niveau_ansm WHEN 'contre_indiquee' THEN 5 WHEN 'deconseillee' THEN 4
                                 WHEN 'precaution' THEN 3 ELSE 2 END >= r.rang
        )
      )
      AND NOT EXISTS (SELECT 1 FROM ddi_c d WHERE d.ma = r.ma AND d.mb = r.mb AND d.rang >= r.rang)
  ) t;

  SELECT COALESCE(jsonb_agg(m.nom),'[]'::jsonb) INTO v_nv FROM medicaments m
  WHERE m.id = ANY(p_med_ids)
    AND NOT EXISTS (SELECT 1 FROM medicament_ingredients mi WHERE mi.medicament_id=m.id);

  SELECT COALESCE(jsonb_agg(m.nom),'[]'::jsonb) INTO v_ok FROM medicaments m
  WHERE m.id = ANY(p_med_ids)
    AND EXISTS (SELECT 1 FROM medicament_ingredients mi WHERE mi.medicament_id=m.id);

  RETURN jsonb_build_object('interactions',v_i,'medicaments_verifies',v_ok,'medicaments_non_verifiables',v_nv);
END;
$function$
